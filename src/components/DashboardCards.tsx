import type { DashboardSummary } from "../services/summary";
import type { Warehouse } from "../types";
import { fmtQty, fmtPct } from "../utils/format";
import { WAREHOUSES_INIT } from "../data/mockData";

interface Props {
  summary:    DashboardSummary;
  warehouses: Warehouse[];
  shownCount: number;
}

const Card = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div className="rounded-lg p-4" style={{ background: "#ffffff", border: "1px solid #e5e7eb" }}>
    <div className="text-xs tracking-widest mb-1" style={{ color: "#6b7280" }}>{label}</div>
    <div className="text-xl font-bold text-black">{value}</div>
    {sub && <div className="text-xs mt-0.5" style={{ color: "#1e3348" }}>{sub}</div>}
  </div>
);

export default function DashboardCards({ summary, warehouses, shownCount }: Props) {
  const { totalOrders, fillRate, totalAllocated, totalRequested, fullyFilled, totalStock } = summary;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card label="TOTAL ORDERS"    value={String(totalOrders)}                   sub={`${shownCount} shown`} />
        <Card label="FILL RATE"       value={fmtPct(fillRate)}                      sub={`${fullyFilled} fully filled`} />
        <Card label="ALLOCATED"       value={`${fmtQty(totalAllocated)} kg`}        sub={`of ${fmtQty(totalRequested)} kg requested`} />
        <Card label="REMAINING STOCK" value={`${fmtQty(totalStock)} kg`}            sub="across all warehouses" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {warehouses.map(wh => {
          const orig = WAREHOUSES_INIT.find(w => w.id === wh.id);
          const pct  = orig && orig.stock > 0 ? (wh.stock / orig.stock) * 100 : 0;
          const bar  = pct > 50 ? "#00e5a0" : pct > 20 ? "#fbbf24" : "#f87171";
          return (
            <div key={wh.id} className="rounded-lg p-3" style={{ background: "#ffffff", border: "1px solid #e5e7eb" }}>
              <div className="flex justify-between text-xs mb-2">
                <span className="font-bold" style={{ color: "#00e5a0" }}>{wh.id}</span>
                <span className="font-mono text-white">
                  {fmtQty(wh.stock)}
                  <span style={{ color: "#2d4a62" }}>/{orig?.stock} kg</span>
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#00e5a0" }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(pct, 100)}%`, background: bar }}
                />
              </div>
              <div className="text-xs mt-1" style={{ color: "#1e3348" }}>{wh.name}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}