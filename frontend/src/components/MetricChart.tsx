import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { WeatherReading } from '../types';

export type HistoryMetric = 'temperature_c' | 'rainfall_mm' | 'humidity_percent';

interface MetricChartProps {
  readings: WeatherReading[];
  metric: HistoryMetric;
  label: string;
  unit: string;
  color: string;
}

function sgTime(iso: string): string {
  return new Intl.DateTimeFormat('en-SG', {
    timeZone: 'Asia/Singapore',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function MetricChart({ readings, metric, label, unit, color }: MetricChartProps) {
  const data = readings.map((r) => ({
    time: sgTime(r.recorded_at),
    value: r[metric],
  }));

  const hasAnyValue = data.some((d) => d.value !== null);

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-950/20 p-4 shadow-lg shadow-sky-950/10 backdrop-blur-xl">
      <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
        {label}
        <span className="ml-1 font-normal normal-case text-white/35">({unit})</span>
      </h2>

      {hasAnyValue ? (
        /* aria-hidden: the ReadingsTable below provides the pointer-free accessible equivalent */
        <div className="overflow-x-auto" aria-hidden="true">
          <div style={{ minWidth: 300 }}>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.06)"
                  vertical={false}
                />
                <XAxis
                  dataKey="time"
                  tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  minTickGap={64}
                />
                <YAxis
                  tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={54}
                  unit={` ${unit}`}
                />
                <Tooltip
                  contentStyle={{
                    background: 'rgb(2 6 23 / 0.92)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 8,
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.85)',
                  }}
                  labelStyle={{ color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}
                  formatter={(value) =>
                    typeof value === 'number' && Number.isFinite(value)
                      ? [`${value} ${unit}`, label]
                      : ['—', label]
                  }
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={color}
                  strokeWidth={1.5}
                  dot={false}
                  connectNulls={false}
                  activeDot={{ r: 3, stroke: color, strokeWidth: 1, fill: color }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <p className="flex h-[180px] items-center justify-center text-sm text-white/35">
          No {label.toLowerCase()} data recorded
        </p>
      )}
    </section>
  );
}
