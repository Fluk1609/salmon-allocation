import type { SubOrder, Warehouse, Customer } from "../types";
import { bankersRound } from "../utils/format";

export interface DashboardSummary {
  totalOrders:     number;
  totalRequested:  number;
  totalAllocated:  number;
  fillRate:        number;
  fullyFilled:     number;
  partialFilled:   number;
  pending:         number;
  totalStock:      number;
  totalValue:      number;
}

export function computeSummary(
  orders:     SubOrder[],
  warehouses: Warehouse[],
  _customers: Customer[],
): DashboardSummary {
  const totalRequested = orders.reduce((s, o) => s + o.requestQty, 0);
  const totalAllocated = orders.reduce((s, o) => s + o.allocated,  0);
  const fullyFilled    = orders.filter(o => o.allocated >= o.requestQty).length;
  const partialFilled  = orders.filter(o => o.allocated > 0 && o.allocated < o.requestQty).length;
  const pending        = orders.filter(o => o.allocated === 0).length;
  const totalStock     = warehouses.reduce((s, w) => s + w.stock, 0);
  const fillRate       = totalRequested > 0
    ? bankersRound((totalAllocated / totalRequested) * 100)
    : 0;

  return {
    totalOrders: orders.length,
    totalRequested,
    totalAllocated,
    fillRate,
    fullyFilled,
    partialFilled,
    pending,
    totalStock,
    totalValue: 0,
  };
}