import type {
  Order,
  Stock,
  Customer,
  AllocationResult,
} from "../types";

// 🔥 priority
const priorityMap = {
  EMERGENCY: 1,
  OVERDUE: 2,
  DAILY: 3,
};

// 🔥 sort ตาม priority + date
function sortOrders(orders: Order[]) {
  return [...orders].sort((a, b) => {
    const pA = priorityMap[a.type];
    const pB = priorityMap[b.type];

    if (pA !== pB) return pA - pB;

    return (
      new Date(a.createDate).getTime() -
      new Date(b.createDate).getTime()
    );
  });
}

export function allocateOrders({
  orders,
  stocks,
  customers,
  manualAlloc = {},
}: {
  orders: Order[];
  stocks: Stock[];
  customers: Customer[];
  manualAlloc?: Record<string, number>;
}): AllocationResult[] {
  // 🔥 sort order
  const sorted = sortOrders(orders);

  // 🔥 map stock
  const stockMap = new Map<string, number>();
  stocks.forEach((s) => {
    stockMap.set(
      `${s.itemId}-${s.warehouseId}-${s.supplierId}`,
      s.availableQty
    );
  });

  // 🔥 map credit
  const creditMap = new Map<string, number>();
  customers.forEach((c) => {
    creditMap.set(c.customerId, c.creditLimit);
  });

  const results: AllocationResult[] = [];

  for (const order of sorted) {
    let credit = creditMap.get(order.customerId) || 0;

    // 🔥 manual override
    if (manualAlloc[order.subOrderId] !== undefined) {
      const manualQty = manualAlloc[order.subOrderId];

      const allowed = Math.min(manualQty, credit);

      creditMap.set(order.customerId, credit - allowed);

      results.push({
        subOrderId: order.subOrderId,
        allocatedQty: allowed,
      });

      continue;
    }

    // 🔥 เริ่ม allocate
    let remaining = Math.min(order.requestQty, credit);
    let allocated = 0;

    // 🔥 หา stock ที่ match
    const possibleStocks = stocks.filter((s) => {
      const matchItem = s.itemId === order.itemId;

      const matchWH =
        order.warehouseId === "WH-000" ||
        s.warehouseId === order.warehouseId;

      const matchSP =
        order.supplierId === "SP-000" ||
        s.supplierId === order.supplierId;

      return matchItem && matchWH && matchSP;
    });

    // 🔥 allocate ทีละ stock
    for (const s of possibleStocks) {
      if (remaining <= 0) break;

      const key = `${s.itemId}-${s.warehouseId}-${s.supplierId}`;
      const available = stockMap.get(key) || 0;

      if (available <= 0) continue;

      const take = Math.min(available, remaining);

      stockMap.set(key, available - take);

      remaining -= take;
      allocated += take;
    }

    // 🔥 update credit
    creditMap.set(order.customerId, credit - allocated);

    results.push({
      subOrderId: order.subOrderId,
      allocatedQty: allocated,
    });
  }

  return results;
}