import type { TypeFilter, StatusFilter } from "../types";

interface Props {
  search:        string;
  typeFilter:    TypeFilter;
  statusFilter:  StatusFilter;
  onSearch:      (v: string) => void;
  onTypeFilter:  (v: TypeFilter) => void;
  onStatusFilter:(v: StatusFilter) => void;
}

const btn = (active: boolean, color: string) => ({
  border:     `1px solid ${active ? color : "#152236"}`,
  background: active ? `${color}18` : "#0d1520",
  color:      active ? color : "#3a5068",
  borderRadius: 6,
  padding:    "6px 11px",
  fontSize:   10,
  fontWeight: 700,
  cursor:     "pointer",
  letterSpacing: "0.05em",
  transition: "all .15s",
} as React.CSSProperties);

const TYPES:   TypeFilter[]   = ["ALL", "EMERGENCY", "OVERDUE", "DAILY"];
const STATUSES: StatusFilter[] = ["ALL", "FULL", "PARTIAL", "PENDING"];

export default function Controls({ search, typeFilter, statusFilter, onSearch, onTypeFilter, onStatusFilter }: Props) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <div className="relative flex-1 min-w-48">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: "#3a5068" }}>🔍</span>
        <input
          type="text"
          placeholder="Search order / customer ID…"
          value={search}
          onChange={e => onSearch(e.target.value)}
          style={{
            width: "100%", paddingLeft: 30, paddingRight: 12, paddingTop: 7, paddingBottom: 7,
            background: "#0d1520", border: "1px solid #152236", borderRadius: 6,
            color: "white", fontSize: 11, outline: "none", boxSizing: "border-box",
          }}
        />
      </div>

      <div className="flex gap-1 flex-wrap">
        {TYPES.map(t => (
          <button key={t} onClick={() => onTypeFilter(t)} style={btn(typeFilter === t, "#00e5a0")}>{t}</button>
        ))}
      </div>

      <div className="flex gap-1 flex-wrap">
        {STATUSES.map(s => (
          <button key={s} onClick={() => onStatusFilter(s)} style={btn(statusFilter === s, "#60a5fa")}>{s}</button>
        ))}
      </div>
    </div>
  );
}