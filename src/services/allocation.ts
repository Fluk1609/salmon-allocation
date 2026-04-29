import type {
  SubOrder,
  Warehouse,
  Customer,
  AllocationLog,
  OrderType
} from "../types";

import {
  PRICES,
  WAREHOUSES_INIT,
  CUSTOMERS_INIT
} from "../data/mockData";

import { bankersRound } from "../utils/format";

export const TYPE_PRIORITY: Record<OrderType, number> = {
  EMERGENCY: 0,
  OVERDUE: 1,
  DAILY: 2
};

const priceMap = new Map(
  PRICES.map(p => [`${p.itemId}-${p.supplierId}`, p])
);

const priceByItem = new Map<string, typeof PRICES>();

PRICES.forEach(p => {
  if (!priceByItem.has(p.itemId)) {
    priceByItem.set(p.itemId, []);
  }
  priceByItem.get(p.itemId)!.push(p);
});

function getBestPrice(itemId: string, type: OrderType): number {
  const candidates = priceByItem.get(itemId) || [];

  if (candidates.length === 0) return 100;

  const best = Math.min(
    ...candidates.map(p => p.basePrice * (p.tiers[type] ?? 1))
  );

  return bankersRound(best);
}

export function getPrice(
  itemId: string,
  supplierId: string,
  type: OrderType
): number {
  if (supplierId === "SP-000") {
    return getBestPrice(itemId, type);
  }

  const entry = priceMap.get(`${itemId}-${supplierId}`);
  if (!entry) return 100;

  return bankersRound(entry.basePrice * (entry.tiers[type] ?? 1));
}

export function getStock(
  warehouseId: string,
  warehouses: Warehouse[]
): number {
  if (warehouseId === "WH-000") {
    return warehouses.reduce((s, w) => s + w.stock, 0);
  }

  return warehouses.find(w => w.id === warehouseId)?.stock ?? 0;
}

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

export interface AutoAllocResult {
  orders: SubOrder[];
  warehouses: Warehouse[];
  customers: Customer[];
  logs: AllocationLog[];
}

export function autoAllocate(inputOrders: SubOrder[]): AutoAllocResult {

  const orders = inputOrders.map(o => ({
    ...o,
    allocated: 0
  }));
  let whState = WAREHOUSES_INIT.map(w => ({ ...w }));
  const custMap = new Map(
    CUSTOMERS_INIT.map(c => [c.id, { ...c }])
  );

  const logs: AllocationLog[] = [];

  const sorted = [...orders].sort((a, b) => {
    const t = TYPE_PRIORITY[a.type] - TYPE_PRIORITY[b.type];
    if (t !== 0) return t;

    return new Date(a.createDate).getTime()
         - new Date(b.createDate).getTime();
  });

  const allocMap = new Map<string, number>();

  for (const ord of sorted) {

    const cust = custMap.get(ord.customerId);
    if (!cust) continue;

    const price = getPrice(ord.itemId, ord.supplierId, ord.type);

    const creditLeft = cust.creditLimit - cust.usedCredit;
    const maxCreditQty =
      price > 0 ? Math.floor(creditLeft / price) : 0;

    const stock = getStock(ord.warehouseId, whState);

    const allocQty = Math.max(
      0,
      Math.min(ord.requestQty, stock, maxCreditQty)
    );

    allocMap.set(ord.subOrderId, allocQty);

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

      let reason = "";

      if (stock === 0) {
        reason = ord.warehouseId === "WH-000"
          ? "No stock in all warehouses"
          : `No stock in ${ord.warehouseId}`;
      }
      else if (maxCreditQty === 0) {
        reason = "Customer credit limit reached";
      }
      else if (stock < ord.requestQty) {
        reason = `Only ${stock} kg available`;
      }
      else if (maxCreditQty < ord.requestQty) {
        reason = `Credit allows only ${maxCreditQty} kg`;
      }
      else {
        reason = "Allocation blocked by constraints";
      }

      logs.push({
        ok: false,
        subOrderId: ord.subOrderId,
        allocatedQty: 0,
        price,
        type: ord.type,
        reason
      });
    }
  }

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