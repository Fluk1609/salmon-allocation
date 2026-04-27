type Props = {
  search: string;
  setSearch: (v: string) => void;
  typeFilter: string;
  setTypeFilter: (v: string) => void;
  onReset: () => void;
  onExport: () => void;
};

export default function Controls({
  search,
  setSearch,
  typeFilter,
  setTypeFilter,
  onReset,
  onExport,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="🔍 Search order..."
        className="border px-3 py-2 rounded-lg w-72 shadow-sm focus:ring-2 focus:ring-blue-400 outline-none"
      />

      <select
        value={typeFilter}
        onChange={(e) => setTypeFilter(e.target.value)}
        className="border px-3 py-2 rounded-lg"
      >
        <option value="ALL">All</option>
        <option value="EMERGENCY">Emergency</option>
        <option value="OVERDUE">Overdue</option>
        <option value="DAILY">Daily</option>
      </select>

      <button
        onClick={onReset}
        className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
      >
        Reset
      </button>

      <button
        onClick={onExport}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
      >
        Export CSV
      </button>
    </div>
  );
}