import { useStore } from '../state/store';
import { CloudIcon, CloseIcon, DropletIcon, HomeIcon } from './icons';
import { formatTemperature, formatTime } from './format';
import { useState, type KeyboardEvent, type MouseEvent } from 'react';
import type { Location } from '../types';

interface SidebarCardProps {
  location: Location;
  isHome: boolean;
}

export function SidebarCard({ location, isHome }: SidebarCardProps) {
  const { selectedId, select, remove } = useStore();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const isSelected = selectedId === location.id;
  const observed = formatTime(location.weather.observed_at);
  const area =
    location.weather.area || `${location.latitude.toFixed(3)}, ${location.longitude.toFixed(3)}`;
  const condition = location.weather.condition || '-';
  const temperature = formatTemperature(location.weather.temperature_c);
  const high = formatTemperature(location.weather.forecast_high_c);
  const low = formatTemperature(location.weather.forecast_low_c);
  const humidity =
    typeof location.weather.humidity_percent === 'number' &&
    Number.isFinite(location.weather.humidity_percent)
      ? `${Math.round(location.weather.humidity_percent)}%`
      : '--%';
  const rainfall =
    typeof location.weather.rainfall_mm === 'number' && Number.isFinite(location.weather.rainfall_mm)
      ? `${location.weather.rainfall_mm.toFixed(1)} mm`
      : '-- mm';

  const onSelect = () => select(location.id);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect();
    }
  };
  const onDelete = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await remove(location.id);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not delete location');
    } finally {
      setIsDeleting(false);
    }
  };
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      aria-pressed={isSelected}
      className={`relative w-full cursor-pointer overflow-hidden rounded-2xl border text-left backdrop-blur-xl transition ${
        isSelected
          ? 'border-white/30 bg-white/20 shadow-lg shadow-black/20'
          : 'border-white/10 bg-white/[0.07] hover:bg-white/[0.12]'
      }`}
    >
      <div className="flex items-start justify-between gap-3 px-4 pt-3">
        <div className="min-w-0">
          <div className="truncate text-lg font-semibold leading-tight text-white">{area}</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/70">
            {isHome ? (
              <>
                <span>My Location</span>
                <span className="text-white/40">·</span>
                <HomeIcon className="h-3 w-3" />
                <span>Home</span>
              </>
            ) : observed ? (
              <span>{observed}</span>
            ) : (
              <span className="text-white/50">Not refreshed</span>
            )}
          </div>
        </div>
        <div className="flex items-start gap-2">
          <div className="text-3xl font-light tabular-nums text-white/90">{temperature}C</div>
          <button
            type="button"
            onClick={onDelete}
            onKeyDown={(event) => event.stopPropagation()}
            disabled={isDeleting}
            aria-label={`Delete ${area}`}
            className="rounded-md p-1 text-white/55 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="mt-3 grid gap-1.5 border-t border-white/10 px-4 py-2 text-xs">
        <div className="flex min-w-0 items-center gap-2 text-white/80">
          <CloudIcon className="h-4 w-4 text-white/70" />
          <span className="truncate">{condition}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-white/60 tabular-nums">
          <span>{humidity}</span>
          <span className="flex items-center gap-1">
            <DropletIcon className="h-3.5 w-3.5" />
            {rainfall}
          </span>
          <span>H:{high} L:{low}</span>
        </div>
      </div>
      {deleteError && (
        <p className="mx-4 mb-3 rounded-md border border-red-300/30 bg-red-500/15 px-2.5 py-1.5 text-xs text-red-100">
          {deleteError}
        </p>
      )}
    </div>
  );
}
