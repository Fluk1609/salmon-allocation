import type {
  SubOrder,
  Warehouse,
  Customer,
  AllocationLog,
  OrderType
} from "../types";

import { PRICES, WAREHOUSES_INIT, CUSTOMERS_INIT } from "../data/mockData";
import { bankersRound } from "../utils/format";

/* =========================
   Priority
========================= */
export const TYPE_PRIORITY: Record<OrderType, number> = {
  EMERGENCY: 0,
  OVERDUE: 1,
  DAILY: 2
};

/* =========================
   🔥 Price Map (O(1))
========================= */
const priceMap = new Map(
  PRICES.map(p => [`${p.itemId}-${p.supplierId}`, p])
);

/* =========================
   💰 Get Best Price (SP-000)
========================= */
function getBestPrice(itemId: string, type: OrderType): number {
  const candidates = PRICES.filter(p => p.itemId === itemId);

  if (candidates.length === 0) return 100;

  return bankersRound(
    Math.min(...candidates.map(p => p.basePrice * (p.tiers[type] ?? 1)))
  );
}

/* =========================
   💰 Get Price
========================= */
export function getPrice(
  itemId: string,
  supplierId: string,
  type: OrderType
): number {

  // 🔥 fallback supplier
  if (supplierId === "SP-000") {
    return getBestPrice(itemId, type);
  }

  const key = `${itemId}-${supplierId}`;
  const entry = priceMap.get(key);

  if (!entry) return 100;

  return bankersRound(entry.basePrice * (entry.tiers[type] ?? 1));
}

/* =========================
   📦 Get Stock
========================= */
export function getStock(
  warehouseId: string,
  warehouses: Warehouse[]
): number {
  if (warehouseId === "WH-000") {
    return warehouses.reduce((s, w) => s + w.stock, 0);
  }

  const wh = warehouses.find(w => w.id === warehouseId);
  return wh?.stock ?? 0;
}

/* =========================
   📉 Deduct Stock
========================= */
export function deductStock(
  warehouseId: string,
  qty: number,
  warehouses: Warehouse[]
): Warehouse[] {

  if (warehouseId === "WH-000") {
    let remaining = qty;

    const sorted = [...warehouses].sort((a, b) => b.stock - a.stock);

    const deductions = new Map<string, number>();

    for (const wh of sorted) {
      if (remaining <= 0) break;

      const take = Math.min(wh.stock, remaining);
      deductions.set(wh.id, take);

      remaining -= take;
    }

    return warehouses.map(w => ({
      ...w,
      stock: w.stock - (deductions.get(w.id) ?? 0)
    }));
  }

  return warehouses.map(w =>
    w.id === warehouseId
      ? { ...w, stock: Math.max(0, w.stock - qty) }
      : w
  );
}

/* =========================
   Result Type
========================= */
export interface AutoAllocResult {
  orders: SubOrder[];
  warehouses: Warehouse[];
  customers: Customer[];
  logs: AllocationLog[];
}

/* =========================
   🚀 AUTO ALLOCATE (CORE)
========================= */
export function autoAllocate(orders: SubOrder[]): AutoAllocResult {

  let whState = WAREHOUSES_INIT.map(w => ({ ...w }));
  const custMap = new Map(CUSTOMERS_INIT.map(c => [c.id, { ...c }]));
  const logs: AllocationLog[] = [];

  /* =========================
     1. SORT (priority + FIFO)
  ========================= */
  const sorted = [...orders].sort((a, b) => {
    const typeDiff = TYPE_PRIORITY[a.type] - TYPE_PRIORITY[b.type];
    if (typeDiff !== 0) return typeDiff;

    return new Date(a.createDate).getTime() - new Date(b.createDate).getTime();
  });

  const allocMap = new Map<string, number>();

  /* =========================
     2. LOOP
  ========================= */
  for (const ord of sorted) {

    const cust = custMap.get(ord.customerId);
    if (!cust) continue;

    /* ===== constraints ===== */
    const price = getPrice(ord.itemId, ord.supplierId, ord.type);

    const creditLeft = cust.creditLimit - cust.usedCredit;
    const maxCreditQty =
      price > 0 ? Math.floor(creditLeft / price) : 0;

    const stock = getStock(ord.warehouseId, whState);

    /* ===== allocation ===== */
    const allocQty = bankersRound(
      Math.max(
        0,
        Math.min(ord.requestQty, stock, maxCreditQty)
      )
    );

    allocMap.set(ord.subOrderId, allocQty);

    /* ===== apply ===== */
    if (allocQty > 0) {

      whState = deductStock(ord.warehouseId, allocQty, whState);

      cust.usedCredit = bankersRound(
        cust.usedCredit + allocQty * price
      );

      logs.push({
        ok: true,
        subOrderId: ord.subOrderId,
        allocatedQty: allocQty,
        price,
        type: ord.type
      });

    } else {

      logs.push({
        ok: false,
        subOrderId: ord.subOrderId,
        allocatedQty: 0,
        price,
        type: ord.type,
        reason:
          stock === 0
            ? "No stock"
            : maxCreditQty === 0
            ? "Credit limit reached"
            : "Insufficient stock/credit"
      });

    }
  }

  /* =========================
     3. APPLY RESULT
  ========================= */
  const updatedOrders = orders.map(o => ({
    ...o,
    allocated: allocMap.get(o.subOrderId) ?? 0
  }));

  return {
    orders: updatedOrders,
    warehouses: whState,
    customers: [...custMap.values()],
    logs
  };
}