import type { SubOrder, Warehouse, Customer } from "../types";
import { getPrice } from "./allocation";

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

export function validateManualAlloc(
  order: SubOrder,
  newQty: number,
  warehouses: Warehouse[],
  customer: Customer,
): ValidationResult {
  if (isNaN(newQty) || newQty < 0) {
    return { ok: false, error: "Invalid value" };
  }

  const price = getPrice(order.itemId, order.supplierId, order.type);
  const creditLeft = customer.creditLimit - customer.usedCredit + order.allocated * price;
  let stockAvail = 0;

  if (order.warehouseId === "WH-000") {
    const totalStock = warehouses.reduce((s, w) => s + w.stock, 0);
    stockAvail = totalStock + order.allocated;
  } else {
    const wh = warehouses.find(w => w.id === order.warehouseId);
    stockAvail = (wh?.stock ?? 0) + order.allocated;
  }

  if (newQty > stockAvail) {
    return { ok: false, error: `Stock insufficient (avail: ${stockAvail.toFixed(2)} kg)` };
  }
  if (newQty * price > creditLeft) {
    return { ok: false, error: `Over credit (฿${creditLeft.toFixed(2)} remaining)` };
  }

  return { ok: true };
}