import { API_BASE } from "../config/api";

export const fetchOrders = async () => {
    const res = await fetch(`${API_BASE}/orders`);
    const data = await res.json();

    const orders = (data.orders || data).map((o: any) => ({
        orderId: o.OrderID,
        subOrderId: o.SubOrderID,
        itemId: o.ItemID,
        warehouseId: o.WarehouseID,
        supplierId: o.SupplierID,
        requestQty: o.RequestQty,
        allocated: o.Allocated,
        type: o.Type,
        createDate: o.CreateDate,
        customerId: o.CustomerID,
        remark: o.Remark || ""
    }));

    return { orders };
};

export async function fetchSummary() {
    const res = await fetch(`${API_BASE}/summary`);
    return res.json();
}

export async function autoAllocateApi(orders: any[]) {
  const res = await fetch(`${API_BASE}/allocate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ orders })
  });

  if (!res.ok) {
    throw new Error("allocate failed");
  }

  const data = await res.json();

  // 🔥 map orders
  const mappedOrders = (data.orders || []).map((o: any) => ({
    orderId: o.OrderID,
    subOrderId: o.SubOrderID,
    itemId: o.ItemID,
    warehouseId: o.WarehouseID,
    supplierId: o.SupplierID,
    requestQty: o.RequestQty ?? 0,
    allocated: o.Allocated ?? 0,
    type: o.Type,
    createDate: o.CreateDate,
    customerId: o.CustomerID
  }));

  // 🔥 map customers (กัน undefined)
  const mappedCustomers = (data.customers || []).map((c: any) => ({
    id: c.ID,
    name: c.Name,
    creditLimit: c.CreditLimit ?? 0,
    usedCredit: c.UsedCredit ?? 0
  }));

  // 🔥 map warehouses (คุณยังไม่ได้ map!)
  const mappedWarehouses = (data.warehouses || []).map((w: any) => ({
    id: w.ID,
    name: w.Name,
    stock: w.Stock ?? 0
  }));

  return {
    orders: mappedOrders,
    warehouses: mappedWarehouses,
    customers: mappedCustomers,
    logs: data.logs || []
  };
}

export async function manualAllocateApi(subOrderId: string, qty: number) {
    const res = await fetch(`${API_BASE}/manual`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ subOrderId, qty })
    });

    if (!res.ok) {
        throw new Error("manual allocate failed");
    }

    const data = await res.json();

    const mappedOrders = (data.orders || []).map((o: any) => ({
        orderId: o.OrderID,
        subOrderId: o.SubOrderID,
        itemId: o.ItemID,
        warehouseId: o.WarehouseID,
        supplierId: o.SupplierID,
        requestQty: o.RequestQty,
        allocated: o.Allocated,
        type: o.Type,
        createDate: o.CreateDate,
        customerId: o.CustomerID
    }));

    return { orders: mappedOrders };
}