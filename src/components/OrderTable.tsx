import { useState, useEffect } from "react";
import type { SubOrder, Warehouse, Customer } from "../types";
import { getPrice } from "../services/allocation";
import { validateManualAlloc } from "../services/validator";
import { fmtMoney, fmtQty } from "../utils/format";
import { useIsMobile } from "../hook/useIsMobile";

const PAGE_SIZE = 25;

const TYPE_BADGE: Record<string, { bg: string; color: string; border: string; dot: string }> = {
  EMERGENCY: { bg: "#fff1f2", color: "#dc2626", border: "#fecaca", dot: "#ef4444" },
  OVERDUE: { bg: "#fffbeb", color: "#b45309", border: "#fde68a", dot: "#f59e0b" },
  DAILY: { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0", dot: "#22c55e" },
};

const TYPE_CARD: Record<string, { bg: string; color: string; border: string; dot: string }> = {
  EMERGENCY: { bg: "#fff1f2", color: "#dc2626", border: "#fecaca", dot: "#ef4444" },
  OVERDUE: { bg: "#fffbeb", color: "#b45309", border: "#fde68a", dot: "#f59e0b" },
  DAILY: { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0", dot: "#22c55e" },
};

interface Props {
  orders: SubOrder[];
  warehouses: Warehouse[];
  totalFiltered: number;
  onManualAlloc: (subOrderId: string, qty: number) => void;
  onManualLog: (log: any) => void;
  customerMap: Map<string, Customer>;
  orderMap: Map<string, SubOrder>;
}

const HEADERS = [
  "SUB ORDER ID",
  "CUSTOMER",
  "ITEM",
  "WH / SP",
  "TYPE",
  "REQUESTED",
  "ALLOCATED",
  "฿/KG",
  "STATUS",
  "MANUAL ALLOCATE",
];

export default function OrderTable({
  orders,
  warehouses,
  totalFiltered,
  onManualAlloc,
  onManualLog,
  customerMap,
  orderMap,
}: Props) {
  const isMobile = useIsMobile();

  const [page, setPage] = useState(1);
  const [inputVals, setInputVals] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [flashId, setFlashId] = useState<string | null>(null);

  useEffect(() => { setPage(1); }, [orders, totalFiltered]);

  const totalPages = Math.max(1, Math.ceil(orders.length / PAGE_SIZE));
  const paginated = orders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSet = (subOrderId: string) => {
    const qty = parseFloat(inputVals[subOrderId]);
    if (isNaN(qty)) { setErrors(p => ({ ...p, [subOrderId]: "Invalid number" })); return; }

    const ord = orderMap.get(subOrderId);
    if (!ord) return;
    const cust = customerMap.get(ord.customerId);
    if (!cust) return;

    const result = validateManualAlloc(ord, qty, warehouses, cust);
    if (!result.ok) { setErrors(p => ({ ...p, [subOrderId]: result.error! })); return; }

    onManualAlloc(subOrderId, qty);
    onManualLog({
      ok: qty > 0,
      subOrderId,
      allocatedQty: qty,
      price: getPrice(ord.itemId, ord.supplierId, ord.type),
      type: ord.type,
      reason: qty === 0 ? "Manual cleared" : "Manual input",
      source: "MANUAL"
    });
    setInputVals(p => { const n = { ...p }; delete n[subOrderId]; return n; });
    setErrors(p => { const n = { ...p }; delete n[subOrderId]; return n; });
    setFlashId(subOrderId);
    setTimeout(() => setFlashId(null), 800);
  };

  if (isMobile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

        {paginated.length === 0 && (
          <div style={{ padding: 32, textAlign: "center", color: "#94a3b8", background: "white", borderRadius: 12, border: "1px solid #e2e8f0" }}>
            No orders match the current filters.
          </div>
        )}

        {paginated.map(ord => {
          const price = getPrice(ord.itemId, ord.supplierId, ord.type);
          const fillPct = ord.requestQty > 0 ? (ord.allocated / ord.requestQty) * 100 : 0;
          const isFull = ord.allocated >= ord.requestQty;
          const isPart = ord.allocated > 0 && !isFull;
          const tc = TYPE_CARD[(ord.type || "").toUpperCase()] || {
            bg: "#f3f4f6",
            color: "#6b7280",
            border: "#e5e7eb",
            dot: "#9ca3af"
          };
          const cust = customerMap.get(ord.customerId);
          const creditLeft = cust ? (cust.creditLimit - cust.usedCredit) / 1000 : 0;
          const err = errors[ord.subOrderId];

          return (
            <div key={ord.subOrderId} style={{
              background: flashId === ord.subOrderId ? "#f0fdf4" : isFull ? "#f0fdf4" : isPart ? "#fffbeb" : "white",
              border: `1px solid ${flashId === ord.subOrderId ? "#bbf7d0" : isFull ? "#bbf7d0" : isPart ? "#fde68a" : "#e2e8f0"}`,
              borderRadius: 12, padding: "14px", transition: "all .4s",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 12, fontFamily: "monospace" }}>{ord.subOrderId}</div>
                  <div style={{ fontSize: 12, color: "#2563eb", marginTop: 2 }}>
                    {ord.customerId} <span style={{ color: "#94a3b8" }}>· ฿{creditLeft.toFixed(0)}k left</span>
                  </div>
                  <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 1 }}>
                    {ord.itemId} · {ord.warehouseId} · {ord.supplierId}
                  </div>
                </div>
                <span style={{
                  background: tc.bg, color: tc.color, border: `1px solid ${tc.border}`,
                  borderRadius: 20, padding: "3px 10px", fontSize: 10, fontWeight: 700,
                  whiteSpace: "nowrap", flexShrink: 0,
                  display: "inline-flex", alignItems: "center", gap: 5,
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: tc.dot }} />
                  {ord.type}
                </span>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                  <span style={{ color: "#64748b" }}>
                    Requested: <strong style={{ color: "#374151" }}>{fmtQty(ord.requestQty)} kg</strong>
                  </span>
                  <span style={{ fontWeight: 700, color: isFull ? "#059669" : isPart ? "#b45309" : "#94a3b8" }}>
                    {isFull ? "✓" : isPart ? "◑" : "○"} {fmtQty(ord.allocated)} kg
                  </span>
                </div>
                <div style={{ height: 6, background: "#f1f5f9", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min(fillPct, 100)}%`, background: isFull ? "#10b981" : isPart ? "#f59e0b" : "#e2e8f0", borderRadius: 99, transition: "width .5s" }} />
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: "#64748b" }}>{fmtMoney(price)}/kg</span>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input
                    type="number" min={0} placeholder={`0–${ord.requestQty}`}
                    value={inputVals[ord.subOrderId] ?? ord.allocated}
                    onChange={e => setInputVals(p => ({ ...p, [ord.subOrderId]: e.target.value }))}
                    onKeyDown={e => e.key === "Enter" && handleSet(ord.subOrderId)}
                    style={{ width: 90, padding: "7px 10px", border: `1.5px solid ${err ? "#ef4444" : "#e2e8f0"}`, borderRadius: 8, fontSize: 13, background: "#f8fafc", color: "#0f172a", outline: "none" }}
                  />
                  <button onClick={() => handleSet(ord.subOrderId)}
                    style={{ background: "#2563eb", color: "white", border: "none", borderRadius: 8, padding: "7px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    Set
                  </button>
                </div>
              </div>

              {err && <div style={{ color: "#dc2626", fontSize: 12, marginTop: 6 }}>{err}</div>}
              {ord.remark && <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 6, fontStyle: "italic" }}>💬 {ord.remark}</div>}
            </div>
          );
        })}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "white", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px" }}>
          <span style={{ fontSize: 12, color: "#64748b" }}>
            <strong style={{ color: "#0f172a" }}>{((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, orders.length)}</strong>
            {" "}/ {totalFiltered.toLocaleString()}
          </span>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              style={{ border: "1px solid #e2e8f0", background: "white", color: page === 1 ? "#d1d5db" : "#374151", borderRadius: 6, padding: "5px 12px", fontSize: 12, cursor: page === 1 ? "default" : "pointer" }}>
              ← Prev
            </button>
            <span style={{ fontSize: 12, color: "#64748b", minWidth: 52, textAlign: "center" }}>{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
              style={{ border: "1px solid #e2e8f0", background: "white", color: page >= totalPages ? "#d1d5db" : "#374151", borderRadius: 6, padding: "5px 12px", fontSize: 12, cursor: page >= totalPages ? "default" : "pointer" }}>
              Next →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg overflow-hidden" style={{ background: "#ffffff", border: "1px solid #e5e7eb" }}>
      <div className="overflow-x-auto">
        <table className="w-full" style={{ borderCollapse: "collapse", fontSize: 12, whiteSpace: "nowrap" }}>
          <thead style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
            <tr>
              {HEADERS.map(h => (
                <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: "normal", letterSpacing: "0.08em", color: "#6b7280", whiteSpace: "nowrap" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 && (
              <tr>
                <td colSpan={HEADERS.length} style={{ padding: 40, textAlign: "center", color: "#1e3348" }}>
                  No orders match the current filters.
                </td>
              </tr>
            )}
            {paginated.map(ord => {
              const price = getPrice(ord.itemId, ord.supplierId, ord.type);
              const fillPct = ord.requestQty > 0 ? (ord.allocated / ord.requestQty) * 100 : 0;
              const isFull = ord.allocated >= ord.requestQty;
              const isPart = ord.allocated > 0 && !isFull;
              const isZero = ord.allocated === 0;
              const tb = TYPE_BADGE[(ord.type || "").toUpperCase()] || {
                bg: "#f3f4f6",
                color: "#6b7280",
                border: "#e5e7eb",
                dot: "#9ca3af"
              };
              const cust = customerMap.get(ord.customerId);
              const creditLeft = cust ? (cust.creditLimit - cust.usedCredit) / 1000 : 0;

              return (
                <tr key={ord.subOrderId} style={{
                  borderBottom: "1px solid #e5e7eb",
                  background: flashId === ord.subOrderId ? "rgba(0,229,160,0.06)"
                    : isFull ? "rgba(0,229,160,0.05)"
                      : isPart ? "rgba(251,191,36,0.05)"
                        : isZero ? "rgba(248,113,113,0.05)"
                          : "transparent",
                  transition: "background .3s",
                }}>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ color: "#1e3348", fontWeight: 700 }}>{ord.subOrderId}</div>
                    <div style={{ color: "#1e3348", fontSize: 10 }}>{ord.orderId}</div>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ color: "#60a5fa" }}>{ord.customerId}</div>
                    {cust && <div style={{ color: "#1e3348", fontSize: 10 }}>฿{creditLeft.toFixed(0)}k left</div>}
                  </td>
                  <td style={{ padding: "10px 12px", color: "#3a5068" }}>{ord.itemId}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ color: ord.warehouseId === "WH-000" ? "#fbbf24" : "#7a9bb5" }}>{ord.warehouseId}</div>
                    <div style={{ color: "#1e3348", fontSize: 10 }}>{ord.supplierId}</div>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ background: tb.bg, color: tb.color, border: `1px solid ${tb.border}`, borderRadius: 4, padding: "2px 7px", fontSize: 10, fontWeight: 700 }}>
                      {ord.type}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "right", color: "#7a9bb5" }}>{fmtQty(ord.requestQty)} kg</td>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ textAlign: "right", color: "white", fontWeight: 700 }}>{fmtQty(ord.allocated)} kg</div>
                    <div
                      style={{
                        height: 6,
                        background: "#f1f5f9",
                        borderRadius: 999,
                        marginTop: 6,
                        overflow: "hidden",
                        width: 100,
                        marginLeft: "auto"
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${Math.min(fillPct, 100)}%`,
                          background: isFull
                            ? "#10b981"
                            : isPart
                              ? "#f59e0b"
                              : "#e5e7eb",
                          borderRadius: 999,
                          transition: "width .5s"
                        }}
                      />
                    </div>
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "right", color: "#3a5068" }}>{fmtMoney(price)}</td>
                  <td style={{ padding: "10px 12px", fontSize: 12 }}>
                    {isFull && <span style={{ color: "#00e5a0" }}>✓ Full</span>}
                    {isPart && <span style={{ color: "#fbbf24" }}>⚡ Partial</span>}
                    {!isFull && !isPart && <span style={{ color: "#1e3348" }}>— Pending</span>}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ display: "flex", gap: 4 }}>
                      <input
                        type="number" min={0} max={ord.requestQty}
                        value={inputVals[ord.subOrderId] ?? ord.allocated}
                        placeholder={`0–${ord.requestQty}`}
                        onChange={e => setInputVals(p => ({ ...p, [ord.subOrderId]: e.target.value }))}
                        onKeyDown={e => e.key === "Enter" && handleSet(ord.subOrderId)}
                        style={{ width: 75, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 5, padding: "4px 7px", color: "#3a5068", fontSize: 12 }}
                      />
                      <button onClick={() => handleSet(ord.subOrderId)}
                        style={{ background: "rgba(0, 229, 160, 0.125)", border: "1px solid #00e5a0", color: "#00e5a0", borderRadius: 5, padding: "4px 8px", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                        Set
                      </button>
                    </div>
                    {errors[ord.subOrderId] && (
                      <div style={{ color: "#f87171", fontSize: 10, marginTop: 3 }}>{errors[ord.subOrderId]}</div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ borderTop: "1px solid #e5e7eb", padding: "10px 16px", display: "flex", justifyContent: "space-between" }}>
        <div style={{ fontSize: 12, color: "#1e3348" }}>
          {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, orders.length)} of {totalFiltered} orders
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span>{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      </div>
    </div>
  );
}