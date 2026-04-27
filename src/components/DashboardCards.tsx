import { formatNumber } from "../utils/format";

type Props = {
  summary: any;
};

export default function DashboardCards({ summary }: Props) {
  const percent =
    summary.totalRequest === 0
      ? 0
      : Math.round(
          (summary.totalAllocated / summary.totalRequest) * 100
        );

  return (
    <div className="space-y-6 mb-6">
      {/* KPI CARDS */}
      <div className="grid grid-cols-4 gap-4">
        <Card
          title="Total Request"
          value={formatNumber(summary.totalRequest)}
          color="blue"
        />
        <Card
          title="Allocated"
          value={formatNumber(summary.totalAllocated)}
          color="green"
        />
        <Card
          title="Remaining"
          value={formatNumber(summary.remaining)}
          color="yellow"
        />
        <Card
          title="Incomplete"
          value={formatNumber(summary.incomplete)}
          color="red"
        />
      </div>

      {/* PROGRESS BAR */}
      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex justify-between mb-2 text-sm font-medium">
          <span>Allocation Progress</span>
          <span>{percent}%</span>
        </div>

        <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden">
          <div
            className="bg-green-500 h-3 transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function Card({
  title,
  value,
  color,
}: {
  title: string;
  value: string;
  color: "blue" | "green" | "yellow" | "red";
}) {
  const colorMap = {
    blue: "from-blue-500 to-blue-400",
    green: "from-green-500 to-green-400",
    yellow: "from-yellow-400 to-yellow-300 text-black",
    red: "from-red-500 to-red-400",
  };

  return (
    <div
      className={`bg-gradient-to-r ${colorMap[color]} text-white p-4 rounded-xl shadow hover:scale-[1.02] transition`}
    >
      <div className="text-sm opacity-80">{title}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}