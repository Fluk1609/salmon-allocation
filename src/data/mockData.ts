import type { Order, Stock, Customer, OrderType } from "../types";

// 🔥 random type (distribution realistic)
function getRandomType(): OrderType {
  const rand = Math.random();

  if (rand < 0.1) return "EMERGENCY";   // 10%
  if (rand < 0.3) return "OVERDUE";     // 20%
  return "DAILY";                       // 70%
}

// 🔥 random date (ย้อนหลัง 30 วัน)
function randomDate() {
  const now = new Date();
  const past = new Date(
    now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000
  );
  return past.toISOString();
}

// 🔥 generate 5000 orders
export const orders: Order[] = Array.from({ length: 5000 }).map((_, i) => {
  const type = getRandomType();

  return {
    subOrderId: `ORD-${i}`,
    itemId: "Item-1",
    warehouseId: "WH-001",
    supplierId: "SP-001",
    requestQty: Math.floor(Math.random() * 100) + 10,
    type,
    createDate: randomDate(),
    customerId: "C1",
  };
});

// 🔥 stock (ให้พอเห็น partial)
export const stocks: Stock[] = [
  {
    itemId: "Item-1",
    warehouseId: "WH-001",
    supplierId: "SP-001",
    availableQty: 120000,
  },
];

// 🔥 credit (จำกัดเพื่อให้เห็น incomplete)
export const customers: Customer[] = [
  {
    customerId: "C1",
    creditLimit: 90000,
  },
];