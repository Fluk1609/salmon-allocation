import type { Warehouse, Customer, PriceEntry, SubOrder } from "../types";

export const WAREHOUSES_INIT: Warehouse[] = [
  { id: "WH-001", name: "Bangkok Central", stock: 500 },
  { id: "WH-002", name: "Chiang Mai Hub",  stock: 300 },
  { id: "WH-003", name: "Phuket Port",     stock: 800 },
];

export const CUSTOMERS_INIT: Customer[] = [
  { id: "CT-0001", name: "Siam Food Group",      creditLimit: 500_000,   usedCredit: 50_000  },
  { id: "CT-0002", name: "Bangkok VIP Catering", creditLimit: 1_000_000, usedCredit: 200_000 },
  { id: "CT-0003", name: "Sea Fresh Market",     creditLimit: 200_000,   usedCredit: 10_000  },
];

export const PRICES: PriceEntry[] = [
  { itemId: "Item-1", supplierId: "SP-001", basePrice: 123.49, tiers: { EMERGENCY: 1.25, OVERDUE: 1.00, DAILY: 0.90 } },
  { itemId: "Item-1", supplierId: "SP-002", basePrice: 115.00, tiers: { EMERGENCY: 1.25, OVERDUE: 1.00, DAILY: 0.90 } },
  { itemId: "Item-2", supplierId: "SP-001", basePrice: 99.75,  tiers: { EMERGENCY: 1.25, OVERDUE: 1.00, DAILY: 0.90 } },
  { itemId: "Item-2", supplierId: "SP-002", basePrice: 95.00,  tiers: { EMERGENCY: 1.25, OVERDUE: 1.00, DAILY: 0.90 } },
];

const SEED: Omit<SubOrder, "allocated">[] = [
  { orderId:"ORDER-0001", subOrderId:"ORDER-0001-001", itemId:"Item-1", warehouseId:"WH-001", supplierId:"SP-001", requestQty:11,  type:"DAILY",     createDate:"2025-01-01", customerId:"CT-0001", remark:"" },
  { orderId:"ORDER-0001", subOrderId:"ORDER-0001-002", itemId:"Item-2", warehouseId:"WH-002", supplierId:"SP-000", requestQty:20,  type:"DAILY",     createDate:"2025-01-01", customerId:"CT-0001", remark:"" },
  { orderId:"ORDER-0002", subOrderId:"ORDER-0002-001", itemId:"Item-1", warehouseId:"WH-001", supplierId:"SP-002", requestQty:300, type:"EMERGENCY", createDate:"2025-03-01", customerId:"CT-0002", remark:"Special for VIP" },
  { orderId:"ORDER-0002", subOrderId:"ORDER-0002-002", itemId:"Item-2", warehouseId:"WH-000", supplierId:"SP-000", requestQty:100, type:"EMERGENCY", createDate:"2025-03-01", customerId:"CT-0002", remark:"Special for VIP" },
  { orderId:"ORDER-0003", subOrderId:"ORDER-0003-001", itemId:"Item-2", warehouseId:"WH-003", supplierId:"SP-001", requestQty:80,  type:"OVERDUE",   createDate:"2025-02-10", customerId:"CT-0003", remark:"" },
  { orderId:"ORDER-0004", subOrderId:"ORDER-0004-001", itemId:"Item-1", warehouseId:"WH-000", supplierId:"SP-002", requestQty:150, type:"DAILY",     createDate:"2025-01-20", customerId:"CT-0002", remark:"" },
  { orderId:"ORDER-0005", subOrderId:"ORDER-0005-001", itemId:"Item-2", warehouseId:"WH-002", supplierId:"SP-001", requestQty:60,  type:"EMERGENCY", createDate:"2025-03-05", customerId:"CT-0003", remark:"Urgent" },
  { orderId:"ORDER-0006", subOrderId:"ORDER-0006-001", itemId:"Item-1", warehouseId:"WH-001", supplierId:"SP-000", requestQty:45,  type:"OVERDUE",   createDate:"2025-02-01", customerId:"CT-0001", remark:"" },
  { orderId:"ORDER-0007", subOrderId:"ORDER-0007-001", itemId:"Item-2", warehouseId:"WH-003", supplierId:"SP-002", requestQty:200, type:"DAILY",     createDate:"2025-01-15", customerId:"CT-0002", remark:"" },
  { orderId:"ORDER-0008", subOrderId:"ORDER-0008-001", itemId:"Item-1", warehouseId:"WH-002", supplierId:"SP-001", requestQty:35,  type:"OVERDUE",   createDate:"2025-02-20", customerId:"CT-0003", remark:"" },
];

const TYPES:   Array<"DAILY"|"OVERDUE"|"EMERGENCY"> = ["DAILY","OVERDUE","EMERGENCY"];
const ITEMS    = ["Item-1","Item-2"];
const WHS      = ["WH-001","WH-002","WH-003","WH-000"];
const SPS      = ["SP-001","SP-002","SP-000"];
const CUSTS    = ["CT-0001","CT-0002","CT-0003"];
const MONTHS   = ["01","02","03"];
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

export function generateOrders(extra = 5000): SubOrder[] {
  const base: SubOrder[] = SEED.map(o => ({ ...o, allocated: 0 }));
  for (let i = SEED.length + 1; i <= SEED.length + extra; i++) {
    const id = `ORDER-${String(i).padStart(4, "0")}`;
    base.push({
      orderId:     id,
      subOrderId:  `${id}-001`,
      itemId:      ITEMS[rand(0, ITEMS.length - 1)],
      warehouseId: WHS[rand(0, WHS.length - 1)],
      supplierId:  SPS[rand(0, SPS.length - 1)],
      requestQty:  rand(5, 300),
      type:        TYPES[rand(0, 2)],
      createDate:  `2025-${MONTHS[rand(0, 2)]}-${String(rand(1, 28)).padStart(2, "0")}`,
      customerId:  CUSTS[rand(0, 2)],
      remark:      "",
      allocated:   0,
    });
  }
  return base;
}