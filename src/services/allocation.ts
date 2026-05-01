import type {
  SubOrder,
  Warehouse,
  Customer,
  AllocationLog,
  OrderType
} from "../types";

import { PRICES } from "../data/mockData";
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

    return warehouses.map(w => {
      const used = deductions.get(w.id) ?? 0;

      return {
        ...w,
        stock: w.stock - used,
        total: w.total ?? w.stock + used
      };
    });
  }

  return warehouses.map(w =>
    w.id === warehouseId
      ? {
        ...w,
        stock: Math.max(0, w.stock - qty),
        total: w.total
      }
      : w
  );
}

export interface AutoAllocResult {
  orders: SubOrder[];
  warehouses: Warehouse[];
  customers: Customer[];
  logs: AllocationLog[];
}

export function autoAllocate(
  inputOrders: SubOrder[],
  warehouses: Warehouse[],
  customers: Customer[]
): AutoAllocResult {

  const orders = inputOrders.map(o => ({
    ...o,
    allocated: 0
  }));

  let whState = warehouses.map(w => ({ ...w }));
  const custMap = new Map(
    customers.map(c => [c.id, { ...c }])
  );

  const allocMap = new Map<string, number>();

  const sorted = [...orders].sort((a, b) => {
    const t = TYPE_PRIORITY[a.type] - TYPE_PRIORITY[b.type];
    if (t !== 0) return t;

    return new Date(a.createDate).getTime()
      - new Date(b.createDate).getTime();
  });

  const groups: Record<OrderType, SubOrder[]> = {
    EMERGENCY: [],
    OVERDUE: [],
    DAILY: []
  };

  sorted.forEach(o => groups[o.type].push(o));

  for (const type of ["EMERGENCY", "OVERDUE", "DAILY"] as OrderType[]) {

    const group = groups[type];
    let hasProgress = true;

    while (hasProgress) {
      hasProgress = false;

      for (const ord of group) {

        const currentAlloc = allocMap.get(ord.subOrderId) ?? 0;
        if (currentAlloc >= ord.requestQty) continue;

        const cust = custMap.get(ord.customerId);
        if (!cust) continue;

        const price = getPrice(ord.itemId, ord.supplierId, ord.type);

        const creditLeft = cust.creditLimit - cust.usedCredit;
        const maxCreditQty =
          price > 0 ? Math.floor(creditLeft / price) : 0;

        const stock = getStock(ord.warehouseId, whState);

        if (stock <= 0 || maxCreditQty <= 0) continue;

        const step = Math.min(
          Math.ceil(ord.requestQty * 0.1),
          ord.requestQty - currentAlloc,
          stock,
          maxCreditQty
        );

        if (step <= 0) continue;

        allocMap.set(ord.subOrderId, currentAlloc + step);

        whState = deductStock(ord.warehouseId, step, whState);

        cust.usedCredit = bankersRound(
          cust.usedCredit + step * price
        );

        hasProgress = true;
      }
    }
  }

  const updatedOrders = orders.map(o => ({
    ...o,
    allocated: allocMap.get(o.subOrderId) ?? 0
  }));
  const logs: AllocationLog[] = updatedOrders.map(o => {
    const price = getPrice(o.itemId, o.supplierId, o.type);

    const stock = getStock(o.warehouseId, whState);
    const cust = custMap.get(o.customerId);

    let reason = "";

    if (o.allocated > 0) {
      return {
        ok: true,
        subOrderId: o.subOrderId,
        allocatedQty: o.allocated,
        price,
        type: o.type
      };
    }

    if (stock === 0) {
      reason = o.warehouseId === "WH-000"
        ? "No stock (all warehouses)"
        : `No stock (${o.warehouseId})`;
    } else if (cust && cust.creditLimit - cust.usedCredit <= 0) {
      reason = "Credit limit reached";
    } else {
      reason = "Insufficient allocation";
    }

    return {
      ok: false,
      subOrderId: o.subOrderId,
      allocatedQty: 0,
      price,
      type: o.type,
      reason
    };
  });

  return {
    orders: updatedOrders,
    warehouses: whState,
    customers: [...custMap.values()],
    logs
  };
}