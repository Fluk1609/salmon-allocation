export type OrderType = "EMERGENCY" | "OVERDUE" | "DAILY";

export interface SubOrder {
  orderId: string;
  subOrderId: string;
  itemId: string;
  warehouseId: string;
  supplierId: string;
  requestQty: number;
  type: OrderType;
  createDate: string;
  customerId: string;
  remark: string;
  allocated: number;
}

export interface Warehouse {
  id: string;
  name: string;
  stock: number;
  total: number;
}

export interface Customer {
  id: string;
  name: string;
  creditLimit: number;
  usedCredit: number;
}

export interface PriceEntry {
  itemId: string;
  supplierId: string;
  basePrice: number;
  tiers: Record<OrderType, number>;
}

export interface AllocationLog {
  ok: boolean;
  subOrderId: string;
  allocatedQty: number;
  price: number;
  type: OrderType;
  reason?: string;
}

export type StatusFilter = "ALL" | "FULL" | "PARTIAL" | "PENDING";
export type TypeFilter   = "ALL" | OrderType;