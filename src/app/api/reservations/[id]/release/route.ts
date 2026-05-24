import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ReservationInvalidStateError,
  ReservationNotFoundError,
  errorResponse,
} from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const result = await prisma.$transaction(async (tx) => {
      type ReservationRow = {
        id: string;
        status: string;
        quantity: number;
        "productId": string;
        "warehouseId": string;
      };

      const rows = await tx.$queryRaw<ReservationRow[]>`
        SELECT id, status, quantity, "productId", "warehouseId"
        FROM "Reservation"
        WHERE id = ${id}
        FOR UPDATE
      `;

      if (rows.length === 0) {
        throw new ReservationNotFoundError();
      }

      const reservation = rows[0];

      // Idempotent: releasing an already-released reservation is a no-op
      if (reservation.status === "RELEASED") {
        return await tx.reservation.findUnique({
          where: { id },
          include: { product: true, warehouse: true },
        });
      }

      if (reservation.status === "CONFIRMED") {
        throw new ReservationInvalidStateError(
          "Cannot release a confirmed reservation — payment has already been processed"
        );
      }

      // Release the reserved hold — units return to available stock
      await tx.$executeRaw`
        UPDATE "Inventory"
        SET reserved = GREATEST(0, reserved - ${reservation.quantity}),
            "updatedAt" = NOW()
        WHERE "productId" = ${reservation.productId}
          AND "warehouseId" = ${reservation.warehouseId}
      `;

      const released = await tx.reservation.update({
        where: { id },
        data: { status: "RELEASED" },
        include: { product: true, warehouse: true },
      });

      return released;
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
