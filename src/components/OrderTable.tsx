import { useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import toast from "react-hot-toast";
import { validateManualAllocation } from "../services/validator";

export default function OrderTable({
  orders,
  results,
  manualAlloc,
  setManualAlloc,
  stocks,
  customers,
}: any) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [sortKey, setSortKey] = useState<string>("subOrderId");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // 🔥 sort
  const sorted = [...orders].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    if (a[sortKey] > b[sortKey]) return dir;
    if (a[sortKey] < b[sortKey]) return -dir;
    return 0;
  });

  const virtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 10,
  });

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const handleChange = (id: string, val: number, req: number) => {
    if (val < 0) return toast.error("Must ≥ 0");
    if (val > req) return toast.error(`Max ${req}`);

    const next = { ...manualAlloc, [id]: val };

    const check = validateManualAllocation({
      orders,
      stocks,
      customers,
      manualAlloc: next,
    });

    if (!check.valid) return toast.error(check.message ?? "Invalid");

    setManualAlloc(next);
  };

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      {/* HEADER */}
      <div className="grid grid-cols-4 bg-gray-100 font-semibold text-center sticky top-0 z-10">
        <Header label="Order" onClick={() => handleSort("subOrderId")} />
        <Header label="Request" onClick={() => handleSort("requestQty")} />
        <Header label="Allocated" />
        <Header label="Status" />
      </div>

      {/* BODY */}
      <div ref={parentRef} className="h-[500px] overflow-auto">
        <div
          style={{
            height: virtualizer.getTotalSize(),
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((v) => {
            const o = sorted[v.index];
            const r = results.find((x: any) => x.subOrderId === o.subOrderId);

            const val =
              manualAlloc[o.subOrderId] ?? r?.allocatedQty ?? 0;

            const status =
              val === o.requestQty
                ? "OK"
                : val === 0
                ? "NONE"
                : "PARTIAL";

            return (
              <div
                key={v.key}
                style={{ transform: `translateY(${v.start}px)` }}
                className="grid grid-cols-4 border-b items-center text-center absolute w-full h-12 hover:bg-gray-50"
              >
                <div>{o.subOrderId}</div>
                <div>{o.requestQty}</div>

                <input
                  className="border w-20 mx-auto text-center rounded"
                  value={val}
                  onChange={(e) =>
                    handleChange(
                      o.subOrderId,
                      Number(e.target.value),
                      o.requestQty
                    )
                  }
                />

                <Status status={status} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Header({ label, onClick }: any) {
  return (
    <div
      onClick={onClick}
      className="p-3 cursor-pointer hover:bg-gray-200"
    >
      {label}
    </div>
  );
}

function Status({ status }: { status: string }) {
  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-bold
      ${
        status === "OK"
          ? "bg-green-100 text-green-700"
          : status === "PARTIAL"
          ? "bg-yellow-100 text-yellow-700"
          : "bg-red-100 text-red-700"
      }`}
    >
      {status}
    </span>
  );
}