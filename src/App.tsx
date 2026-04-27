import { useMemo, useState } from "react";
import { Toaster } from "react-hot-toast";

import { orders, stocks, customers } from "./data/mockData";
import { allocateOrders } from "./services/allocation";
import { calculateSummary } from "./services/summary";

import Controls from "./components/Controls";
import OrderTable from "./components/OrderTable";
import DashboardCards from "./components/DashboardCards";
import { useDebounce } from "./hook/useDebounce";

export default function App() {
  const [manualAlloc, setManualAlloc] = useState({});
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const debounced = useDebounce(search);

  // 🔍 filter
  const filtered = useMemo(() => {
    return orders
      .filter((o) =>
        o.subOrderId.toLowerCase().includes(debounced.toLowerCase())
      )
      .filter((o) =>
        typeFilter === "ALL" ? true : o.type === typeFilter
      );
  }, [debounced, typeFilter]);

  // ⚙️ allocation
  const results = useMemo(() => {
    return allocateOrders({
      orders: filtered,
      stocks,
      customers,
      manualAlloc,
    });
  }, [filtered, manualAlloc]);

  // 📊 dashboard
  const summary = useMemo(() => {
    return calculateSummary(filtered, results);
  }, [filtered, results]);

  // 📤 export
  const exportCSV = () => {
    const rows = filtered.map((o, i) => {
      const r = results[i];
      return `${o.subOrderId},${o.requestQty},${r?.allocatedQty}`;
    });

    const blob = new Blob(
      [["Order,Request,Allocated\n", ...rows].join("\n")],
      { type: "text/csv" }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "allocation.csv";
    a.click();
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <Toaster position="top-right" />

      <h1 className="text-3xl font-bold mb-6">
        🐟 Salmon Allocation Dashboard
      </h1>

      {/* 🔥 DASHBOARD */}
      <DashboardCards summary={summary} />

      {/* 🔍 CONTROLS */}
      <Controls
        search={search}
        setSearch={setSearch}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        onReset={() => setManualAlloc({})}
        onExport={exportCSV}
      />

      {/* 📋 TABLE */}
      <OrderTable
        orders={filtered}
        results={results}
        manualAlloc={manualAlloc}
        setManualAlloc={setManualAlloc}
        stocks={stocks}
        customers={customers}
      />
    </div>
  );
}