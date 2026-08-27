import type { WeatherReading } from '../types';

interface ReadingsTableProps {
  readings: WeatherReading[];
}

function sgTime(iso: string): string {
  return new Intl.DateTimeFormat('en-SG', {
    timeZone: 'Asia/Singapore',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function fmtNum(value: number | null, decimals: number): string {
  return value !== null && Number.isFinite(value) ? value.toFixed(decimals) : '—';
}

export function ReadingsTable({ readings }: ReadingsTableProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-950/20 shadow-lg shadow-sky-950/10 backdrop-blur-xl">
      <h2 className="px-4 pt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
        All readings
      </h2>

      <div
        className="mt-3 overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/40"
        tabIndex={0}
        role="region"
        aria-label="Historical readings table, scrollable"
      >
        <table className="w-full text-sm">
          <caption className="sr-only">
            Historical weather readings, oldest to newest. Dash (—) indicates an unavailable value.
          </caption>
          <thead>
            <tr className="border-b border-white/10 text-left text-xs font-medium text-white/45">
              <th scope="col" className="whitespace-nowrap px-4 pb-2 pt-0">
                Time recorded (SGT)
              </th>
              <th scope="col" className="whitespace-nowrap px-4 pb-2 pt-0">
                Provider time (SGT)
              </th>
              <th scope="col" className="whitespace-nowrap px-4 pb-2 pt-0 text-right">
                Temp (°C)
              </th>
              <th scope="col" className="whitespace-nowrap px-4 pb-2 pt-0 text-right">
                Rain (mm)
              </th>
              <th scope="col" className="whitespace-nowrap px-4 pb-2 pt-0 text-right">
                Humidity (%)
              </th>
            </tr>
          </thead>
          <tbody>
            {readings.map((r, i) => (
              <tr
                key={`${r.recorded_at}-${i}`}
                className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]"
              >
                <td className="whitespace-nowrap px-4 py-2 text-white/70">
                  {sgTime(r.recorded_at)}
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-white/50">
                  {r.observed_at ? sgTime(r.observed_at) : '—'}
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-white/85">
                  {fmtNum(r.temperature_c, 1)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-white/85">
                  {fmtNum(r.rainfall_mm, 1)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-white/85">
                  {fmtNum(r.humidity_percent, 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
