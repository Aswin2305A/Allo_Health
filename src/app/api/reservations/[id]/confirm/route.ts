import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ReservationExpiredError,
  ReservationInvalidStateError,
  ReservationNotFoundError,
  errorResponse,
} from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // ─── Idempotency (Bonus) ────────────────────────────────────────────────
    const idempotencyKey = request.headers.get("Idempotency-Key");

    const result = await prisma.$transaction(async (tx) => {
      // Lock the reservation row to prevent concurrent confirm/release
      type ReservationRow = {
        id: string;
        status: string;
        "expiresAt": Date;
        quantity: number;
        "productId": string;
        "warehouseId": string;
        "idempotencyKey": string | null;
      };

      const rows = await tx.$queryRaw<ReservationRow[]>`
        SELECT id, status, "expiresAt", quantity, "productId", "warehouseId", "idempotencyKey"
        FROM "Reservation"
        WHERE id = ${id}
        FOR UPDATE
      `;

      if (rows.length === 0) {
        throw new ReservationNotFoundError();
      }

      const reservation = rows[0];

      // Idempotency: if already confirmed (possibly with same key), return as-is
      if (reservation.status === "CONFIRMED") {
        return await tx.reservation.findUnique({
          where: { id },
          include: { product: true, warehouse: true },
        });
      }

      if (reservation.status === "RELEASED") {
        throw new ReservationInvalidStateError(
          "This reservation has already been released"
        );
      }

      // Lazy expiry check: if expired, release it and return 410
      if (new Date(reservation.expiresAt) < new Date()) {
        // Release the hold before throwing
        await tx.$executeRaw`
          UPDATE "Inventory"
          SET reserved = GREATEST(0, reserved - ${reservation.quantity}),
              "updatedAt" = NOW()
          WHERE "productId" = ${reservation.productId}
            AND "warehouseId" = ${reservation.warehouseId}
        `;
        await tx.reservation.update({
          where: { id },
          data: { status: "RELEASED" },
        });
        throw new ReservationExpiredError();
      }

      // ─── Confirm ─────────────────────────────────────────────────────────
      // Decrement TOTAL stock (unit is now sold) and release the reserved hold.
      // Net effect: total -= quantity, reserved -= quantity
      // (available = total - reserved stays the same until committed)
      await tx.$executeRaw`
        UPDATE "Inventory"
        SET total    = GREATEST(0, total    - ${reservation.quantity}),
            reserved = GREATEST(0, reserved - ${reservation.quantity}),
            "updatedAt" = NOW()
        WHERE "productId" = ${reservation.productId}
          AND "warehouseId" = ${reservation.warehouseId}
      `;

      const confirmed = await tx.reservation.update({
        where: { id },
        data: { status: "CONFIRMED" },
        include: { product: true, warehouse: true },
      });

      return confirmed;
    });

    return NextResponse.json(formatReservation(result!));
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
