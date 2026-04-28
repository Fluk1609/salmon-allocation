import { useState, useEffect, useMemo } from "react";
import type { SubOrder, Warehouse, Customer, TypeFilter, StatusFilter, AllocationLog } from "./types";
import { generateOrders } from "./data/mockData";
import { autoAllocate, getPrice, deductStock } from "./services/allocation";
import { validateManualAlloc } from "./services/validator";
import { computeSummary } from "./services/summary";
import { bankersRound, fmtQty } from "./utils/format";
import { useDebounce } from "./hook/useDebounce";
import DashboardCards from "./components/DashboardCards";
import Controls from "./components/Controls";
import * as XLSX from "xlsx";
import OrderTable from "./components/OrderTable";

export default function App() {
  const [orders, setOrders] = useState<SubOrder[]>(() => generateOrders());
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [logs, setLogs] = useState<AllocationLog[]>([]);
  const [showLog, setShowLog] = useState(false);
  const [running, setRunning] = useState(false);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [statFilter, setStatFilter] = useState<StatusFilter>("ALL");
  const [sortBy, setSortBy] = useState<"date" | "qty" | "allocated">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const debouncedSearch = useDebounce(search, 250);

  useEffect(() => { runAuto(); }, []);

  function runAuto() {
    setRunning(true);
    setTimeout(() => {
      const result = autoAllocate(orders);
      setOrders(result.orders);
      setWarehouses(result.warehouses);
      setCustomers(result.customers);
      setLogs(result.logs);
      setRunning(false);
    }, 50);
  }

  function handleExport() {
    const data = filtered.map(o => ({
      Order: o.orderId,
      SubOrder: o.subOrderId,
      Customer: o.customerId,
      Item: o.itemId,
      Warehouse: o.warehouseId,
      Type: o.type,
      Requested: o.requestQty,
      Allocated: o.allocated,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "Orders");

    XLSX.writeFile(wb, "orders.xlsx");
  }

  const customerMap = useMemo(() => {
    return new Map(customers.map(c => [c.id, c]));
  }, [customers]);

  const orderMap = useMemo(() => {
    return new Map(orders.map(o => [o.subOrderId, o]));
  }, [orders]);

  function handleManualAlloc(subOrderId: string, qty: number) {
    const ord = orderMap.get(subOrderId)!;
    const cust = customerMap.get(ord.customerId)!;
    const { ok } = validateManualAlloc(ord, qty, warehouses, cust);
    if (!ok) return;

    const price = getPrice(ord.itemId, ord.supplierId, ord.type);
    const diff = qty - ord.allocated;

    setOrders(p => p.map(o => o.subOrderId === subOrderId ? { ...o, allocated: qty } : o));
    setWarehouses(p => deductStock(ord.warehouseId, diff, p));
    setCustomers(p => p.map(c => c.id === ord.customerId
      ? { ...c, usedCredit: bankersRound(c.usedCredit + diff * price) }
      : c
    ));
  }

  const filtered = useMemo(() => orders.filter(o => {
    const s = debouncedSearch.toLowerCase();
    const ms = !s || o.orderId.toLowerCase().includes(s) || o.subOrderId.toLowerCase().includes(s) || o.customerId.toLowerCase().includes(s);
    const mt = typeFilter === "ALL" || o.type === typeFilter;
    const mv =
      statFilter === "ALL" ? true :
        statFilter === "FULL" ? o.allocated >= o.requestQty :
          statFilter === "PARTIAL" ? o.allocated > 0 && o.allocated < o.requestQty :
            o.allocated === 0;
    return ms && mt && mv;
  }), [orders, debouncedSearch, typeFilter, statFilter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];

    arr.sort((a, b) => {
      let result = 0;

      if (sortBy === "date") {
        result =
          new Date(a.createDate).getTime() -
          new Date(b.createDate).getTime();
      }

      if (sortBy === "qty") {
        result = a.requestQty - b.requestQty;
      }

      if (sortBy === "allocated") {
        result = a.allocated - b.allocated;
      }

      return sortDir === "asc" ? result : -result;
    });

    return arr;
  }, [filtered, sortBy, sortDir]);
  const summary = useMemo(() => computeSummary(orders, warehouses, customers), [orders, warehouses, customers]);

  return (
    <div style={{ minHeight: "100vh", background: "#070d14", fontFamily: "'IBM Plex Mono','Courier New',monospace", color: "#c8d6e5" }}>

      <header style={{ background: "rgba(7,13,20,0.97)", borderBottom: "1px solid #152236", position: "sticky", top: 0, zIndex: 30, backdropFilter: "blur(8px)" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 24px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 20 }}>🐟</span>
            <div>
              <div style={{ fontWeight: 700, color: "white", fontSize: 13, letterSpacing: "0.12em" }}>SALMON ALLOCATOR</div>
              <div style={{ fontSize: 10, color: "#2d4a62", letterSpacing: "0.08em" }}>Supply Chain · Allocation System</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowLog(p => !p)}
              style={{ border: "1px solid #152236", background: "transparent", color: "#3a5068", borderRadius: 6, padding: "6px 12px", fontSize: 11, cursor: "pointer" }}>
              📋 Log ({logs.length})
            </button>
            <button onClick={runAuto} disabled={running}
              style={{ background: running ? "#00281d" : "#00e5a0", color: running ? "#00e5a0" : "#07120e", borderRadius: 6, padding: "6px 16px", fontSize: 11, fontWeight: 700, border: "none", cursor: "pointer", opacity: running ? 0.7 : 1, transition: "all .3s" }}>
              {running ? "⏳ Running…" : "⚡ Auto Allocate"}
            </button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

        <DashboardCards summary={summary} warehouses={warehouses} shownCount={filtered.length} />

        {running && (
          <div style={{
            padding: 10,
            fontSize: 12,
            color: "#00e5a0"
          }}>
            ⚡ Allocating orders...
          </div>
        )}

        {showLog && (
          <div className="rounded-lg p-4 overflow-y-auto" style={{ background: "#0d1520", border: "1px solid #152236", maxHeight: 180 }}>
            <div style={{ fontSize: 10, letterSpacing: "0.1em", marginBottom: 8, color: "#3a5068" }}>ALLOCATION LOG</div>
            {logs.map((e, i) => (
              <div key={i} style={{ fontSize: 11, color: e.ok ? "#00e5a0" : "#f87171", padding: "1px 0" }}>
                {e.ok ? "✓" : "✗"} {e.subOrderId} → {fmtQty(e.allocatedQty)} kg
                {!e.ok && e.reason ? ` | ${e.reason}` : ""}
              </div>
            ))}
          </div>
        )}

        <Controls
          search={search}
          typeFilter={typeFilter}
          statusFilter={statFilter}
          onSearch={v => { setSearch(v); }}
          onTypeFilter={v => { setTypeFilter(v); }}
          onStatusFilter={v => { setStatFilter(v); }}
        />
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 8 }}>

            <button
              onClick={() => setSortBy("date")}
              style={{
                color: sortBy === "date" ? "#00e5a0" : "#3a5068",
                background: sortBy === "date" ? "#00281d" : "transparent",
                border: "1px solid #152236",
                borderRadius: 6,
                padding: "4px 10px",
                cursor: "pointer"
              }}
            >
              Date
            </button>

            <button
              onClick={() => setSortBy("qty")}
              style={{
                color: sortBy === "qty" ? "#00e5a0" : "#3a5068",
                background: sortBy === "qty" ? "#00281d" : "transparent",
                border: "1px solid #152236",
                borderRadius: 6,
                padding: "4px 10px",
                cursor: "pointer"
              }}
            >
              Qty
            </button>

            <button
              onClick={() => setSortBy("allocated")}
              style={{
                color: sortBy === "allocated" ? "#00e5a0" : "#3a5068",
                background: sortBy === "allocated" ? "#00281d" : "transparent",
                border: "1px solid #152236",
                borderRadius: 6,
                padding: "4px 10px",
                cursor: "pointer"
              }}
            >
              Allocated
            </button>

            <button
              onClick={() =>
                setSortDir(d => (d === "asc" ? "desc" : "asc"))
              }
              style={{
                border: "1px solid #152236",
                borderRadius: 6,
                padding: "4px 10px",
                cursor: "pointer",
                color: "#60a5fa"
              }}
            >
              {sortDir === "asc" ? "⬆️" : "⬇️"}
            </button>

          </div>
          <div style={{ marginTop: 8, display: "flex", gap: "10px" }}>
            <button
              onClick={() => {
                setSearch("");
                setTypeFilter("ALL");
                setStatFilter("ALL");
              }}
              style={{
                border: "1px solid #152236",
                background: "transparent",
                color: "#f87171",
                borderRadius: 6,
                padding: "4px 10px",
                fontSize: 11,
                cursor: "pointer"
              }}
            >
              Reset Filters
            </button>

            <button onClick={handleExport}
              style={{
                border: "1px solid #152236",
                background: "transparent",
                color: "#FFF",
                borderRadius: 6,
                padding: "4px 10px",
                fontSize: 11,
                cursor: "pointer"
              }}>
              Export Excel
            </button>
          </div>
        </div>

        <OrderTable
          orders={sorted}
          warehouses={warehouses}
          customerMap={customerMap}
          orderMap={orderMap}
          totalFiltered={sorted.length}
          onManualAlloc={handleManualAlloc}
        />

        <div className="rounded-lg overflow-hidden" style={{ background: "#0d1520", border: "1px solid #152236" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #152236" }}>
            <div style={{ fontSize: 10, letterSpacing: "0.1em", color: "#3a5068" }}>CUSTOMER CREDIT USAGE</div>
          </div>
          <div className="overflow-x-auto">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead style={{ background: "#07111c" }}>
                <tr>
                  {["CUSTOMER", "NAME", "LIMIT", "USED", "REMAINING", "UTILIZATION"].map(h => (
                    <th key={h} style={{ padding: "8px 16px", textAlign: "left", fontWeight: "normal", letterSpacing: "0.07em", color: "#2d4a62" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customers.map(c => {
                  const pct = c.creditLimit > 0 ? (c.usedCredit / c.creditLimit) * 100 : 0;
                  const bar = pct > 80 ? "#f87171" : pct > 50 ? "#fbbf24" : "#00e5a0";
                  return (
                    <tr key={c.id} style={{ borderTop: "1px solid #0d1a27" }}>
                      <td style={{ padding: "10px 16px", color: "#60a5fa" }}>{c.id}</td>
                      <td style={{ padding: "10px 16px", color: "#7a9bb5" }}>{c.name}</td>
                      <td style={{ padding: "10px 16px", color: "white", textAlign: "right" }}>฿{c.creditLimit.toLocaleString()}</td>
                      <td style={{ padding: "10px 16px", color: "#fbbf24", textAlign: "right" }}>฿{c.usedCredit.toLocaleString("en", { maximumFractionDigits: 0 })}</td>
                      <td style={{ padding: "10px 16px", color: "#00e5a0", textAlign: "right" }}>฿{(c.creditLimit - c.usedCredit).toLocaleString("en", { maximumFractionDigits: 0 })}</td>
                      <td style={{ padding: "10px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ flex: 1, height: 4, background: "#152236", borderRadius: 4, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: bar, borderRadius: 4, transition: "width .5s" }} />
                          </div>
                          <span style={{ width: 40, textAlign: "right", color: "#3a5068", fontSize: 10 }}>{pct.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}