export type WarehouseWithStock = {
  id: string;
  name: string;
  location: string;
  available: number;
  reserved: number;
  total: number;
};

export type ProductWithStock = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  sku: string;
  warehouses: WarehouseWithStock[];
};

export type ReservationWithDetails = {
  id: string;
  quantity: number;
  status: "PENDING" | "CONFIRMED" | "RELEASED";
  expiresAt: string;
  createdAt: string;
  product: {
    id: string;
    name: string;
    price: number;
    sku: string;
    imageUrl: string | null;
  };
  warehouse: {
    id: string;
    name: string;
    location: string;
  };
};
