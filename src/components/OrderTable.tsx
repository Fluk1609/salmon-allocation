import { useState } from "react";
import type { SubOrder, Warehouse, Customer } from "../types";
import { getPrice } from "../services/allocation";
import { validateManualAlloc } from "../services/validator";
import { fmtMoney, fmtQty } from "../utils/format";

const PAGE_SIZE = 25;

const TYPE_BADGE: Record<string, { bg: string; color: string; border: string }> = {
  EMERGENCY: { bg: "#2d0a0a", color: "#f87171", border: "#7f1d1d" },
  OVERDUE:   { bg: "#2d1a00", color: "#fbbf24", border: "#78350f" },
  DAILY:     { bg: "#002d26", color: "#34d399", border: "#065f46" },
};

interface Props {
  orders: SubOrder[];
  warehouses: Warehouse[];
  totalFiltered: number;
  onManualAlloc: (subOrderId: string, qty: number) => void;
  customerMap: Map<string, Customer>;
  orderMap: Map<string, SubOrder>; // 🔥 เพิ่มเพื่อ optimize
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
  "MANUAL ALLOCATE"
];

export default function OrderTable({
  orders,
  warehouses,
  totalFiltered,
  onManualAlloc,
  customerMap,
  orderMap
}: Props) {

  const [page, setPage] = useState(1);
  const [inputVals, setInputVals] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [flashId, setFlashId] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(orders.length / PAGE_SIZE));
  const paginated = orders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // 🔥 handle allocate (safe + optimized)
  const handleSet = (subOrderId: string) => {
    const raw = inputVals[subOrderId];
    const qty = parseFloat(raw);

    if (isNaN(qty)) {
      setErrors(p => ({ ...p, [subOrderId]: "Invalid number" }));
      return;
    }

    const ord = orderMap.get(subOrderId);
    if (!ord) return;

    const cust = customerMap.get(ord.customerId);
    if (!cust) return;

    const result = validateManualAlloc(ord, qty, warehouses, cust);
    if (!result.ok) {
      setErrors(p => ({ ...p, [subOrderId]: result.error! }));
      return;
    }

    onManualAlloc(subOrderId, qty);

    // clear input + error
    setInputVals(p => {
      const n = { ...p };
      delete n[subOrderId];
      return n;
    });

    setErrors(p => {
      const n = { ...p };
      delete n[subOrderId];
      return n;
    });

    // flash effect
    setFlashId(subOrderId);
    setTimeout(() => setFlashId(null), 800);
  };

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ background: "#0d1520", border: "1px solid #152236" }}
    >
      <div className="overflow-x-auto">
        <table
          className="w-full"
          style={{ borderCollapse: "collapse", fontSize: 11 }}
        >
          <thead
            style={{ background: "#07111c", borderBottom: "1px solid #152236" }}
          >
            <tr>
              {HEADERS.map(h => (
                <th
                  key={h}
                  style={{
                    padding: "10px 12px",
                    textAlign: "left",
                    fontWeight: "normal",
                    letterSpacing: "0.08em",
                    color: "#2d4a62",
                    whiteSpace: "nowrap"
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {paginated.length === 0 && (
              <tr>
                <td
                  colSpan={HEADERS.length}
                  style={{
                    padding: 40,
                    textAlign: "center",
                    color: "#1e3348"
                  }}
                >
                  No orders match the current filters.
                </td>
              </tr>
            )}

            {paginated.map((ord, idx) => {
              const price = getPrice(ord.itemId, ord.supplierId, ord.type);

              const fillPct =
                ord.requestQty > 0
                  ? (ord.allocated / ord.requestQty) * 100
                  : 0;

              const isFull = ord.allocated >= ord.requestQty;
              const isPart = ord.allocated > 0 && !isFull;

              const tb = TYPE_BADGE[ord.type];

              // 🔥 ใช้ Map แทน find
              const cust = customerMap.get(ord.customerId);

              const creditLeft = cust
                ? (cust.creditLimit - cust.usedCredit) / 1000
                : 0;

              return (
                <tr
                  key={ord.subOrderId}
                  style={{
                    borderBottom: "1px solid #0d1a27",
                    background:
                      flashId === ord.subOrderId
                        ? "rgba(0,229,160,0.06)"
                        : idx % 2 === 0
                        ? "transparent"
                        : "rgba(255,255,255,0.015)",
                    transition: "background .3s"
                  }}
                >
                  {/* ID */}
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ color: "white", fontWeight: 700 }}>
                      {ord.subOrderId}
                    </div>
                    <div style={{ color: "#1e3348", fontSize: 10 }}>
                      {ord.orderId}
                    </div>
                  </td>

                  {/* CUSTOMER */}
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ color: "#60a5fa" }}>
                      {ord.customerId}
                    </div>
                    {cust && (
                      <div style={{ color: "#1e3348", fontSize: 10 }}>
                        ฿{creditLeft.toFixed(0)}k left
                      </div>
                    )}
                  </td>

                  {/* ITEM */}
                  <td style={{ padding: "10px 12px", color: "#3a5068" }}>
                    {ord.itemId}
                  </td>

                  {/* WH */}
                  <td style={{ padding: "10px 12px" }}>
                    <div
                      style={{
                        color:
                          ord.warehouseId === "WH-000"
                            ? "#fbbf24"
                            : "#7a9bb5"
                      }}
                    >
                      {ord.warehouseId}
                    </div>
                    <div style={{ color: "#1e3348", fontSize: 10 }}>
                      {ord.supplierId}
                    </div>
                  </td>

                  {/* TYPE */}
                  <td style={{ padding: "10px 12px" }}>
                    <span
                      style={{
                        background: tb.bg,
                        color: tb.color,
                        border: `1px solid ${tb.border}`,
                        borderRadius: 4,
                        padding: "2px 7px",
                        fontSize: 10,
                        fontWeight: 700
                      }}
                    >
                      {ord.type}
                    </span>
                  </td>

                  {/* REQUEST */}
                  <td
                    style={{
                      padding: "10px 12px",
                      textAlign: "right",
                      color: "#7a9bb5"
                    }}
                  >
                    {fmtQty(ord.requestQty)} kg
                  </td>

                  {/* ALLOCATED */}
                  <td style={{ padding: "10px 12px" }}>
                    <div
                      style={{
                        textAlign: "right",
                        color: "white",
                        fontWeight: 700
                      }}
                    >
                      {fmtQty(ord.allocated)} kg
                    </div>

                    <div
                      style={{
                        height: 3,
                        background: "#152236",
                        borderRadius: 3,
                        marginTop: 4,
                        overflow: "hidden",
                        width: 56,
                        marginLeft: "auto"
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${Math.min(fillPct, 100)}%`,
                          background: isFull
                            ? "#00e5a0"
                            : isPart
                            ? "#fbbf24"
                            : "#152236",
                          borderRadius: 3,
                          transition: "width .5s"
                        }}
                      />
                    </div>
                  </td>

                  {/* PRICE */}
                  <td
                    style={{
                      padding: "10px 12px",
                      textAlign: "right",
                      color: "#3a5068"
                    }}
                  >
                    {fmtMoney(price)}
                  </td>

                  {/* STATUS */}
                  <td style={{ padding: "10px 12px", fontSize: 11 }}>
                    {isFull && (
                      <span style={{ color: "#00e5a0" }}>✓ Full</span>
                    )}
                    {isPart && (
                      <span style={{ color: "#fbbf24" }}>⚡ Partial</span>
                    )}
                    {!isFull && !isPart && (
                      <span style={{ color: "#1e3348" }}>
                        — Pending
                      </span>
                    )}
                  </td>

                  {/* INPUT */}
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ display: "flex", gap: 4 }}>
                      <input
                        type="number"
                        min={0}
                        max={ord.requestQty}
                        value={inputVals[ord.subOrderId] ?? ""}
                        placeholder={`0–${ord.requestQty}`}
                        onChange={e =>
                          setInputVals(p => ({
                            ...p,
                            [ord.subOrderId]: e.target.value
                          }))
                        }
                        onKeyDown={e =>
                          e.key === "Enter" &&
                          handleSet(ord.subOrderId)
                        }
                        style={{
                          width: 75,
                          background: "#07111c",
                          border: "1px solid #152236",
                          borderRadius: 5,
                          padding: "4px 7px",
                          color: "white",
                          fontSize: 11
                        }}
                      />

                      <button
                        onClick={() =>
                          handleSet(ord.subOrderId)
                        }
                        style={{
                          background: "#00281d",
                          border: "1px solid #00e5a0",
                          color: "#00e5a0",
                          borderRadius: 5,
                          padding: "4px 8px",
                          fontSize: 10,
                          fontWeight: 700,
                          cursor: "pointer"
                        }}
                      >
                        Set
                      </button>
                    </div>

                    {errors[ord.subOrderId] && (
                      <div
                        style={{
                          color: "#f87171",
                          fontSize: 10,
                          marginTop: 3
                        }}
                      >
                        {errors[ord.subOrderId]}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div
        style={{
          borderTop: "1px solid #152236",
          padding: "10px 16px",
          display: "flex",
          justifyContent: "space-between"
        }}
      >
        <div style={{ fontSize: 11, color: "#1e3348" }}>
          {((page - 1) * PAGE_SIZE) + 1}–
          {Math.min(page * PAGE_SIZE, orders.length)} of {totalFiltered} orders
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            ← Prev
          </button>

          <span>
            {page} / {totalPages}
          </span>

          <button
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}