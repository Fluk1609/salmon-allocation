export type OrderType = "EMERGENCY" | "OVERDUE" | "DAILY";

export interface Order {
  subOrderId: string;
  itemId: string;
  warehouseId: string;
  supplierId: string;
  requestQty: number;
  type: OrderType;
  createDate: string;
  customerId: string;
}

export interface Stock {
  itemId: string;
  warehouseId: string;
  supplierId: string;
  availableQty: number;
}

export interface Customer {
  customerId: string;
  creditLimit: number;
}

export interface AllocationResult {
  subOrderId: string;
  allocatedQty: number;
}