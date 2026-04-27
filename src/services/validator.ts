import type { Order, Stock, Customer } from "../types";

export function validateManualAllocation({
  orders,
  stocks = [],
  customers = [],
  manualAlloc,
}: {
  orders: Order[];
  stocks?: Stock[];
  customers?: Customer[];
  manualAlloc: Record<string, number>;
}) {
  const stockMap = new Map<string, number>();
  const creditMap = new Map<string, number>();

  stocks.forEach((s) => {
    stockMap.set(
      `${s.itemId}-${s.warehouseId}-${s.supplierId}`,
      s.availableQty
    );
  });

  customers.forEach((c) => {
    creditMap.set(c.customerId, c.creditLimit);
  });

  for (const o of orders) {
    const val = manualAlloc[o.subOrderId];
    if (val === undefined) continue;

    const credit = creditMap.get(o.customerId) || 0;

    if (val > credit) {
      return { valid: false, message: "Credit exceeded" };
    }

    const key = `${o.itemId}-${o.warehouseId}-${o.supplierId}`;
    const stock = stockMap.get(key) || 0;

    if (val > stock) {
      return { valid: false, message: "Stock not enough" };
    }

    stockMap.set(key, stock - val);
    creditMap.set(o.customerId, credit - val);
  }

  return { valid: true };
}