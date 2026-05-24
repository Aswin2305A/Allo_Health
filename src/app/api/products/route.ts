import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        inventory: {
          include: {
            warehouse: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const response = products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      imageUrl: p.imageUrl,
      price: p.price,
      sku: p.sku,
      warehouses: p.inventory.map((inv) => ({
        id: inv.warehouse.id,
        name: inv.warehouse.name,
        location: inv.warehouse.location,
        available: Math.max(0, inv.total - inv.reserved),
        reserved: inv.reserved,
        total: inv.total,
      })),
    }));

    return NextResponse.json(response);
  } catch (error) {
    return errorResponse(error);
  }
}
