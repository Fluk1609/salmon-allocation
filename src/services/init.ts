import { WAREHOUSES_INIT, CUSTOMERS_INIT } from "../data/mockData";

export function initData() {
    return {
        warehouses: WAREHOUSES_INIT.map(w => ({
            ...w,
            total: w.stock
        })),
        customers: CUSTOMERS_INIT.map(c => ({ ...c }))
    };
}