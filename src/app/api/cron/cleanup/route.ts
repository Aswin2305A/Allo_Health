import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/cron/cleanup
 *
 * Releases all PENDING reservations that have passed their expiresAt.
 * In production this is called by Vercel Cron (configured in vercel.json)
 * every minute. Protected by a shared secret to prevent abuse.
 *
 * Each expired reservation:
 *  1. Decrements the reserved count on Inventory
 *  2. Sets Reservation.status → RELEASED
 *
 * We do this in batches inside a single transaction for atomicity.
 */
export async function POST(request: NextRequest) {
  // Protect the cron endpoint with a secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    // Find all expired pending reservations
    const expired = await prisma.reservation.findMany({
      where: {
        status: "PENDING",
        expiresAt: { lt: now },
      },
      select: {
        id: true,
        quantity: true,
        productId: true,
        warehouseId: true,
      },
    });

    if (expired.length === 0) {
      return NextResponse.json({ released: 0, message: "Nothing to clean up" });
    }

    // Release all expired reservations atomically
    let released = 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await prisma.$transaction(async (tx: any) => {
      for (const r of expired) {
        await tx.$executeRaw`
          UPDATE "Inventory"
          SET reserved = GREATEST(0, reserved - ${r.quantity}),
              "updatedAt" = NOW()
          WHERE "productId" = ${r.productId}
            AND "warehouseId" = ${r.warehouseId}
        `;
      }

      const result = await tx.reservation.updateMany({
        where: {
          id: { in: expired.map((r) => r.id) },
          status: "PENDING", // double-check status hasn't changed
        },
        data: { status: "RELEASED" },
      });

      released = result.count;
    });

    console.log(`[cron/cleanup] Released ${released} expired reservations`);

    return NextResponse.json({
      released,
      message: `Released ${released} expired reservation(s)`,
    });
  } catch (error) {
    console.error("[cron/cleanup] Error:", error);
    return NextResponse.json(
      { error: "Cleanup failed" },
      { status: 500 }
    );
  }
}

// Also allow GET so Vercel Cron can call it directly
export { POST as GET };
