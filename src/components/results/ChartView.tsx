import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useProjection } from '../../hooks/useProjection';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/formatters';

interface ChartDataPoint {
  age: number;
  taxable: number;
  traditional: number;
  roth: number;
  hsa: number;
  cash: number;
  total: number;
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: number;
}) {
  if (!active || !payload) return null;

  const total = payload.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <div className="bg-bg-secondary border border-border-default rounded-lg p-3 shadow-lg">
      <p className="text-sm font-medium text-text-primary mb-2">Age {label}</p>
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-text-secondary capitalize">{entry.name}</span>
            </div>
            <span className="text-text-primary tabular-nums">
              {formatCurrency(entry.value)}
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between gap-4 text-xs pt-1 border-t border-border-subtle">
          <span className="text-text-secondary font-medium">Total</span>
          <span className="text-text-primary font-medium tabular-nums">
            {formatCurrency(total)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ChartView() {
  const { state, whatIf } = useApp();
  const { projections, summary } = useProjection();

  // Transform projections for chart
  const chartData: ChartDataPoint[] = projections.map((p) => ({
    age: p.age,
    taxable: Math.max(0, p.taxableBalance),
    traditional: Math.max(0, p.traditionalBalance),
    roth: Math.max(0, p.rothBalance),
    hsa: Math.max(0, p.hsaBalance),
    cash: Math.max(0, p.cashBalance),
    total: Math.max(0, p.taxableBalance + p.traditionalBalance + p.rothBalance + p.hsaBalance + p.cashBalance),
  }));

  const effectiveFIAge = state.profile.targetFIAge;
  const effectiveSSAge = whatIf?.ssStartAge ?? state.socialSecurity.startAge;

  const formatYAxis = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  return (
    <div className="bg-bg-secondary border border-border-subtle rounded-lg p-4">
      <h3 className="text-sm font-semibold text-text-primary mb-4">Portfolio Over Time</h3>

      <div className="h-[300px] lg:h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 20, right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#27272a"
              vertical={false}
            />
            <XAxis
              dataKey="age"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#a1a1aa', fontSize: 11 }}
              tickMargin={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#a1a1aa', fontSize: 11 }}
              tickFormatter={formatYAxis}
              tickMargin={8}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Reference lines */}
            <ReferenceLine
              x={effectiveFIAge}
              stroke="#3b82f6"
              strokeDasharray="4 4"
              label={{
                value: 'FI',
                position: 'top',
                fill: '#3b82f6',
                fontSize: 10,
              }}
            />
            {state.socialSecurity.include && (
              <ReferenceLine
                x={effectiveSSAge}
                stroke="#22c55e"
                strokeDasharray="4 4"
                label={{
                  value: 'SS',
                  position: 'top',
                  fill: '#22c55e',
                  fontSize: 10,
                }}
              />
            )}
            <ReferenceLine
              x={59.5}
              stroke="#52525b"
              strokeDasharray="2 2"
            />
            <ReferenceLine
              x={73}
              stroke="#52525b"
              strokeDasharray="2 2"
            />
            {summary.hasShortfall && summary.shortfallAge && (
              <ReferenceLine
                x={summary.shortfallAge}
                stroke="#ef4444"
                strokeWidth={2}
                label={{
                  value: 'Shortfall',
                  position: 'top',
                  fill: '#ef4444',
                  fontSize: 10,
                }}
              />
            )}

            {/* Stacked areas */}
            <Area
              type="monotone"
              dataKey="cash"
              stackId="1"
              stroke="#52525b"
              fill="#52525b"
              fillOpacity={0.8}
              name="cash"
            />
            <Area
              type="monotone"
              dataKey="hsa"
              stackId="1"
              stroke="#eab308"
              fill="#eab308"
              fillOpacity={0.8}
              name="hsa"
            />
            <Area
              type="monotone"
              dataKey="taxable"
              stackId="1"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.8}
              name="taxable"
            />
            <Area
              type="monotone"
              dataKey="traditional"
              stackId="1"
              stroke="#a855f7"
              fill="#a855f7"
              fillOpacity={0.8}
              name="traditional"
            />
            <Area
              type="monotone"
              dataKey="roth"
              stackId="1"
              stroke="#22c55e"
              fill="#22c55e"
              fillOpacity={0.8}
              name="roth"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-4 pt-3 border-t border-border-subtle">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-[#22c55e]" />
          <span className="text-xs text-text-secondary">Roth</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-[#a855f7]" />
          <span className="text-xs text-text-secondary">Traditional</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-[#3b82f6]" />
          <span className="text-xs text-text-secondary">Taxable</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-[#eab308]" />
          <span className="text-xs text-text-secondary">HSA</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-[#52525b]" />
          <span className="text-xs text-text-secondary">Cash</span>
        </div>
      </div>
    </div>
  );
}
