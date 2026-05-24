import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clean up existing data
  await prisma.reservation.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();

  // Create warehouses
  const [chennai, bengaluru, delhi] = await Promise.all([
    prisma.warehouse.create({
      data: { name: "Chennai Central", location: "Chennai, TN" },
    }),
    prisma.warehouse.create({
      data: { name: "Bengaluru Tech Hub", location: "Bengaluru, KA" },
    }),
    prisma.warehouse.create({
      data: { name: "Delhi NCR", location: "New Delhi, DL" },
    }),
  ]);

  console.log("✅ Created 3 warehouses");

  // Create products
  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: "Sony WH-1000XM5 Headphones",
        description:
          "Industry-leading noise cancelling with 30-hour battery life",
        price: 29990,
        sku: "SONY-WH-XM5-BLK",
        imageUrl:
          "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "Apple AirPods Pro (2nd Gen)",
        description: "Active Noise Cancellation, Adaptive Transparency",
        price: 24900,
        sku: "APPLE-APP-2GEN",
        imageUrl:
          "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "Keychron K2 Mechanical Keyboard",
        description: "75% compact wireless mechanical keyboard",
        price: 7499,
        sku: "KEYCHRON-K2-V2",
        imageUrl:
          "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "Logitech MX Master 3S Mouse",
        description: "Advanced wireless mouse with quiet clicks",
        price: 9995,
        sku: "LOGI-MXM3S-BLK",
        imageUrl:
          "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "Samsung Galaxy S25 Ultra",
        description: "Flagship smartphone with 200MP camera and S Pen",
        price: 129999,
        sku: "SAMSUNG-S25-ULTRA",
        imageUrl:
          "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400",
      },
    }),
    prisma.product.create({
      data: {
        name: "Dell UltraSharp 27\" Monitor",
        description: "4K USB-C Hub Monitor with 98% DCI-P3 coverage",
        price: 52990,
        sku: "DELL-U2723DE",
        imageUrl:
          "https://images.unsplash.com/photo-1547119957-637f8679db1e?w=400",
      },
    }),
  ]);

  console.log(`✅ Created ${products.length} products`);

  // Create inventory — vary stock levels to make it interesting
  const inventoryData = [
    // Sony Headphones
    { productId: products[0].id, warehouseId: chennai.id, total: 15 },
    { productId: products[0].id, warehouseId: bengaluru.id, total: 8 },
    { productId: products[0].id, warehouseId: delhi.id, total: 2 }, // scarce!
    // AirPods Pro
    { productId: products[1].id, warehouseId: chennai.id, total: 25 },
    { productId: products[1].id, warehouseId: bengaluru.id, total: 1 }, // almost gone!
    { productId: products[1].id, warehouseId: delhi.id, total: 18 },
    // Keychron keyboard
    { productId: products[2].id, warehouseId: chennai.id, total: 0 }, // out of stock
    { productId: products[2].id, warehouseId: bengaluru.id, total: 30 },
    { productId: products[2].id, warehouseId: delhi.id, total: 12 },
    // Logitech mouse
    { productId: products[3].id, warehouseId: chennai.id, total: 20 },
    { productId: products[3].id, warehouseId: bengaluru.id, total: 14 },
    { productId: products[3].id, warehouseId: delhi.id, total: 7 },
    // Anker charger
    { productId: products[4].id, warehouseId: chennai.id, total: 50 },
    { productId: products[4].id, warehouseId: bengaluru.id, total: 45 },
    { productId: products[4].id, warehouseId: delhi.id, total: 60 },
    // Dell monitor
    { productId: products[5].id, warehouseId: chennai.id, total: 5 },
    { productId: products[5].id, warehouseId: bengaluru.id, total: 3 },
    { productId: products[5].id, warehouseId: delhi.id, total: 4 },
  ];

  await prisma.inventory.createMany({ data: inventoryData });
  console.log(`✅ Created ${inventoryData.length} inventory records`);

  console.log("\n🎉 Database seeded successfully!");
  console.log(`   Warehouses: 3`);
  console.log(`   Products: ${products.length}`);
  console.log(`   Inventory records: ${inventoryData.length}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
