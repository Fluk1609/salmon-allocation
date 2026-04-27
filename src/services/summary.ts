import type { Order, AllocationResult } from "../types";

export function calculateSummary(
  orders: Order[],
  results: AllocationResult[]
) {
  let totalRequest = 0;
  let totalAllocated = 0;
  let incomplete = 0;

  orders.forEach((o, i) => {
    const allocated = results[i]?.allocatedQty || 0;

    totalRequest += o.requestQty;
    totalAllocated += allocated;

    if (allocated < o.requestQty) {
      incomplete++;
    }
  });

  return {
    totalRequest,
    totalAllocated,
    remaining: totalRequest - totalAllocated,
    incomplete,
  };
}