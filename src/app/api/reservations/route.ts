import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  InsufficientStockError,
  ReservationInvalidStateError,
  errorResponse,
} from "@/lib/errors";

export const dynamic = "force-dynamic";

const RESERVATION_TTL_MINUTES = 10;

const ReserveSchema = z.object({
  productId: z.string().min(1, "productId is required"),
  warehouseId: z.string().min(1, "warehouseId is required"),
  quantity: z.number().int().min(1, "quantity must be at least 1"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ReserveSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { productId, warehouseId, quantity } = parsed.data;

    // ─── Idempotency (Bonus) ────────────────────────────────────────────────
    // If client sends an Idempotency-Key header, check if we already processed
    // this request. If so, return the original response.
    const idempotencyKey = request.headers.get("Idempotency-Key");
    if (idempotencyKey) {
      const existing = await prisma.reservation.findUnique({
        where: { idempotencyKey },
        include: { product: true, warehouse: true },
      });
      if (existing) {
        return NextResponse.json(formatReservation(existing), { status: 200 });
      }
    }

    // ─── Core Reservation Logic ──────────────────────────────────────────────
    // We use a serializable transaction with SELECT ... FOR UPDATE to guarantee
    // that only one concurrent request can succeed when multiple requests race
    // for the last unit of the same SKU at the same warehouse.
    //
    // Flow:
    //  1. Lock the inventory row (FOR UPDATE blocks all other concurrent locks)
    //  2. Re-read available stock inside the lock
    //  3. If insufficient → throw 409 (other transaction sees the same shortage)
    //  4. Increment reserved atomically
    //  5. Create the reservation record
    //  6. Commit — lock is released, next waiter runs against updated reserved count
    //
    // This guarantees: exactly one winner per unit. The loser gets a 409.

    const expiresAt = new Date(
      Date.now() + RESERVATION_TTL_MINUTES * 60 * 1000
    );

    type InventoryRow = {
      id: string;
      total: number;
      reserved: number;
    };

    const reservation = await prisma.$transaction(
      async (tx) => {
        // Lock the specific inventory row to prevent concurrent modifications
        const rows = await tx.$queryRaw<InventoryRow[]>`
          SELECT id, total, reserved
          FROM "Inventory"
          WHERE "productId" = ${productId}
            AND "warehouseId" = ${warehouseId}
          FOR UPDATE
        `;

        if (rows.length === 0) {
          throw new ReservationInvalidStateError(
            "No inventory record found for this product/warehouse combination"
          );
        }

        const inv = rows[0];
        const available = inv.total - inv.reserved;

        if (available < quantity) {
          throw new InsufficientStockError(
            `Only ${available} unit${available === 1 ? "" : "s"} available (${quantity} requested)`
          );
        }

        // Atomically increment reserved count
        await tx.$executeRaw`
          UPDATE "Inventory"
          SET reserved = reserved + ${quantity},
              "updatedAt" = NOW()
          WHERE id = ${inv.id}
        `;

        // Create the reservation record
        const newReservation = await tx.reservation.create({
          data: {
            productId,
            warehouseId,
            quantity,
            expiresAt,
            idempotencyKey: idempotencyKey ?? undefined,
          },
          include: { product: true, warehouse: true },
        });

        return newReservation;
      },
      {
        // Serializable isolation ensures that concurrent transactions see a
        // consistent view of inventory — no phantom reads possible.
        isolationLevel: "Serializable",
      }
    );

    return NextResponse.json(formatReservation(reservation), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatReservation(r: any) {
  return {
    id: r.id,
    quantity: r.quantity,
    status: r.status,
    expiresAt: r.expiresAt.toISOString(),
    createdAt: r.createdAt.toISOString(),
    product: {
      id: r.product.id,
      name: r.product.name,
      price: r.product.price,
      sku: r.product.sku,
      imageUrl: r.product.imageUrl,
    },
    warehouse: {
      id: r.warehouse.id,
      name: r.warehouse.name,
      location: r.warehouse.location,
    },
  };
}
