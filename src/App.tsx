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
import { useIsMobile } from "./hook/useIsMobile";
import { initData } from "./services/init";

export default function App() {
  const isMobile = useIsMobile();
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

  useEffect(() => {
    const init = initData();
    setWarehouses(init.warehouses);
    setCustomers(init.customers);
  }, []);

  function runAuto() {
    setRunning(true);

    setTimeout(() => {
      const result = autoAllocate(orders, warehouses, customers);

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
    if (diff > 0) {
      setWarehouses(p => deductStock(ord.warehouseId, diff, p));
    } else if (diff < 0) {
      setWarehouses(p =>
        p.map(w =>
          w.id === ord.warehouseId
            ? { ...w, stock: w.stock + Math.abs(diff) }
            : w
        )
      );
    }
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
    <div style={{ minHeight: "100vh", background: "#f5f7fb", fontFamily: "'IBM Plex Mono','Courier New',monospace", color: "#111827" }}>

      <header style={{ background: "#ffffff", borderBottom: "1px solid #e5e7eb", position: "sticky", top: 0, zIndex: 30, backdropFilter: "blur(8px)" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 24px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div>
              <div style={{ fontWeight: 700, color: "#2d4a62", fontSize: 13, letterSpacing: "0.12em" }}>ALLOCATOR</div>
              <div style={{ fontSize: 10, color: "#2d4a62", letterSpacing: "0.08em" }}>Supply Chain · Allocation System</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowLog(p => !p)}
              style={{ border: "1px solid #e5e7eb", background: "transparent", color: "#3a5068", borderRadius: 6, padding: "6px 12px", fontSize: 11, cursor: "pointer" }}>
              📋 Log ({logs.length})
            </button>
            <button onClick={runAuto} disabled={summary.totalStock === 0}
              style={{ background: running ? "#00281d" : "#00e5a0", color: running ? "#00e5a0" : "#07120e", borderRadius: 6, padding: "6px 16px", fontSize: 11, fontWeight: 700, border: "none", cursor: "pointer", opacity: running ? 0.7 : 1, transition: "all .3s" }}>
              {running ? "⏳ Running…" : "⚡ Auto Allocate"}
            </button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

        <DashboardCards summary={summary} warehouses={warehouses} shownCount={filtered.length} />

        {showLog && (
          <div className="rounded-lg p-4 overflow-y-auto" style={{ background: "#fff", border: "1px solid #e5e7eb", maxHeight: 180 }}>
            <div style={{ fontSize: 10, letterSpacing: "0.1em", marginBottom: 8, color: "#3a5068" }}>ALLOCATION LOG</div>
            {logs.map((e, i) => (
              <div key={i} style={{ fontSize: 11, color: e.ok ? "#00e5a0" : "#f87171", padding: "1px 0" }}>
                {e.ok ? "✓" : "✗"} {e.subOrderId} → {fmtQty(e.allocatedQty)} kg
                {!e.ok && e.reason ? ` | ${e.reason}` : ""}
              </div>
            ))}
          </div>
        )}
        <div style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          padding: "1rem",
          borderRadius: "0.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem"
        }}>

          <Controls
            search={search}
            typeFilter={typeFilter}
            statusFilter={statFilter}
            onSearch={v => { setSearch(v); }}
            onTypeFilter={v => { setTypeFilter(v); }}
            onStatusFilter={v => { setStatFilter(v); }}
          />
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
            alignItems: "center"
          }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>

              <button
                onClick={() => setSortBy("date")}
                style={{
                  color: sortBy === "date" ? "#00e5a0" : "#3a5068",
                  background: sortBy === "date" ? "#fff" : "transparent",
                  border: "1px solid #e5e7eb",
                  borderRadius: 6,
                  padding: "4px 10px",
                  fontSize: 11,
                  cursor: "pointer"
                }}
              >
                Date
              </button>

              <button
                onClick={() => setSortBy("qty")}
                style={{
                  color: sortBy === "qty" ? "#00e5a0" : "#3a5068",
                  background: sortBy === "qty" ? "#fff" : "transparent",
                  border: "1px solid #e5e7eb",
                  borderRadius: 6,
                  padding: "4px 10px",
                  fontSize: 11,
                  cursor: "pointer"
                }}
              >
                Qty
              </button>

              <button
                onClick={() => setSortBy("allocated")}
                style={{
                  color: sortBy === "allocated" ? "#00e5a0" : "#3a5068",
                  background: sortBy === "allocated" ? "#fff" : "transparent",
                  border: "1px solid #e5e7eb",
                  borderRadius: 6,
                  padding: "4px 10px",
                  fontSize: 11,
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
                  border: "1px solid #e5e7eb",
                  borderRadius: 6,
                  padding: "4px 10px",
                  cursor: "pointer",
                  color: "#60a5fa"
                }}
              >
                {sortDir === "asc" ? "⬆️" : "⬇️"}
              </button>

            </div>
            <div style={{ flexWrap: "wrap", display: "flex", gap: "10px" }}>
              <button
                onClick={() => {
                  setSearch("");
                  setTypeFilter("ALL");
                  setStatFilter("ALL");
                }}
                style={{
                  border: "1px solid #e5e7eb",
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
                  border: "1px solid #e5e7eb",
                  background: "transparent",
                  color: "#00e5a0",
                  borderRadius: 6,
                  padding: "4px 10px",
                  fontSize: 11,
                  cursor: "pointer"
                }}>
                Export Excel
              </button>
            </div>
          </div>
        </div>

        <OrderTable
          orders={sorted}
          warehouses={warehouses}
          customerMap={customerMap}
          orderMap={orderMap}
          totalFiltered={sorted.length}
          onManualAlloc={handleManualAlloc}
          onManualLog={(log) => setLogs(prev => [log, ...prev])}
        />

        {isMobile ? (

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {customers.map(c => {
              const pct = c.creditLimit > 0 ? (c.usedCredit / c.creditLimit) * 100 : 0;

              const bar =
                pct > 80 ? "#ef4444" :
                  pct > 50 ? "#f59e0b" :
                    "#10b981";

              return (
                <div
                  key={c.id}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    padding: 12
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{c.id}</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>{c.name}</div>

                  <div style={{ marginTop: 6, fontSize: 12 }}>
                    Limit: ฿{c.creditLimit.toLocaleString()}
                  </div>

                  <div style={{ fontSize: 12 }}>
                    Used: ฿{c.usedCredit.toLocaleString()}
                  </div>

                  <div style={{ fontSize: 12 }}>
                    Remaining: ฿{(c.creditLimit - c.usedCredit).toLocaleString()}
                  </div>

                  <div style={{ marginTop: 8 }}>
                    <div
                      style={{
                        height: 6,
                        background: "#e5e7eb",
                        borderRadius: 999,
                        overflow: "hidden"
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.min(pct, 100)}%`,
                          height: "100%",
                          background: bar
                        }}
                      />
                    </div>

                    <div style={{ textAlign: "right", fontSize: 11 }}>
                      {pct.toFixed(1)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        ) : (

          <div
            className="rounded-lg overflow-hidden"
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              boxShadow: "0 2px 6px rgba(0,0,0,0.05)"
            }}
          >
            <div
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid #e5e7eb"
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  color: "#6b7280",
                  fontWeight: 600
                }}
              >
                CUSTOMER CREDIT USAGE
              </div>
            </div>

            <div className="overflow-x-auto">
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 12
                }}
              >
                <thead style={{ background: "#f9fafb" }}>
                  <tr>
                    {["CUSTOMER", "NAME", "LIMIT", "USED", "REMAINING", "UTILIZATION"].map(h => (
                      <th
                        key={h}
                        style={{
                          padding: "10px 16px",
                          textAlign: "left",
                          fontWeight: 500,
                          color: "#6b7280"
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {customers.map(c => {
                    const pct =
                      c.creditLimit > 0
                        ? (c.usedCredit / c.creditLimit) * 100
                        : 0;

                    const bar =
                      pct > 80 ? "#ef4444" :
                        pct > 50 ? "#f59e0b" :
                          "#10b981";

                    return (
                      <tr
                        key={c.id}
                        style={{
                          borderTop: "1px solid #f1f5f9"
                        }}
                      >
                        <td style={{ padding: "10px 16px", color: "#2563eb" }}>
                          {c.id}
                        </td>

                        <td style={{ padding: "10px 16px", color: "#374151" }}>
                          {c.name}
                        </td>

                        <td
                          style={{
                            padding: "10px 16px",
                            textAlign: "right",
                            color: "#111827"
                          }}
                        >
                          ฿{c.creditLimit.toLocaleString()}
                        </td>

                        <td
                          style={{
                            padding: "10px 16px",
                            textAlign: "right",
                            color: "#f59e0b"
                          }}
                        >
                          ฿{c.usedCredit.toLocaleString()}
                        </td>

                        <td
                          style={{
                            padding: "10px 16px",
                            textAlign: "right",
                            color: "#10b981"
                          }}
                        >
                          ฿{(c.creditLimit - c.usedCredit).toLocaleString()}
                        </td>

                        <td style={{ padding: "10px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div
                              style={{
                                flex: 1,
                                height: 6,
                                background: "#e5e7eb",
                                borderRadius: 999,
                                overflow: "hidden"
                              }}
                            >
                              <div
                                style={{
                                  width: `${Math.min(pct, 100)}%`,
                                  height: "100%",
                                  background: bar,
                                  borderRadius: 999,
                                  transition: "width .4s"
                                }}
                              />
                            </div>

                            <span
                              style={{
                                width: 40,
                                textAlign: "right",
                                fontSize: 11,
                                color: "#6b7280"
                              }}
                            >
                              {pct.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        )}

      </div>
    </div>
  );
}