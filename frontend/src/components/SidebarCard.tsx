import { useStore } from '../state/store';
import { ChevronDownIcon, ChevronUpIcon, CloudIcon, CloseIcon, DropletIcon, HomeIcon } from './icons';
import { formatTemperature, formatTime } from './format';
import { useState, type KeyboardEvent, type MouseEvent } from 'react';
import type { Location } from '../types';

interface SidebarCardProps {
  location: Location;
  isHome: boolean;
  isFiltered: boolean;
  isFirstNonPrimary: boolean;
  isLast: boolean;
}

export function SidebarCard({
  location,
  isHome,
  isFiltered,
  isFirstNonPrimary,
  isLast,
}: SidebarCardProps) {
  const { selectedId, select, remove, reorder, setPrimary } = useStore();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [reorderError, setReorderError] = useState<string | null>(null);
  const [primaryError, setPrimaryError] = useState<string | null>(null);
  const [primaryAnnouncement, setPrimaryAnnouncement] = useState('');
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
  const onReorder = async (event: MouseEvent<HTMLButtonElement>, direction: 'up' | 'down') => {
    event.stopPropagation();
    setReorderError(null);
    try {
      await reorder(location.id, direction);
    } catch (err) {
      setReorderError(err instanceof Error ? err.message : 'Could not reorder location');
    }
  };
  const onSetPrimary = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setPrimaryError(null);
    setPrimaryAnnouncement('');
    try {
      await setPrimary(location.id);
      setPrimaryAnnouncement(`${area} is now primary`);
    } catch (err) {
      setPrimaryError(err instanceof Error ? err.message : 'Could not set primary location');
    }
  };
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      aria-pressed={isSelected}
      className={`relative w-full cursor-pointer overflow-hidden rounded-2xl border text-left shadow-lg shadow-black/10 backdrop-blur-xl transition ${
        isSelected
          ? 'border-sky-100/50 bg-sky-100/20 shadow-sky-950/30'
          : 'border-white/10 bg-slate-950/20 hover:border-white/20 hover:bg-white/[0.12]'
      }`}
    >
      <div className="px-4 pt-3">
        <div className="min-w-0">
          <div className="break-words text-lg font-semibold leading-tight text-white">{area}</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/70">
            {location.is_primary && (
              <span className="rounded-full border border-sky-200/40 bg-sky-200/15 px-1.5 py-0.5 font-medium text-sky-50">
                Primary
              </span>
            )}
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
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="text-3xl font-light tabular-nums text-white/90">{temperature}C</div>
          <div className="flex flex-wrap items-center gap-1">
            {!location.is_primary && !isFiltered && (
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={(event) => onReorder(event, 'up')}
                  onKeyDown={(event) => event.stopPropagation()}
                  disabled={isFirstNonPrimary}
                  aria-label={`Move ${area} up`}
                  className="rounded-md p-1 text-white/55 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronUpIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={(event) => onReorder(event, 'down')}
                  onKeyDown={(event) => event.stopPropagation()}
                  disabled={isLast}
                  aria-label={`Move ${area} down`}
                  className="rounded-md p-1 text-white/55 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronDownIcon className="h-4 w-4" />
                </button>
              </div>
            )}
            {!location.is_primary && !isFiltered && (
              <button
                type="button"
                onClick={onSetPrimary}
                onKeyDown={(event) => event.stopPropagation()}
                aria-label={`Set ${area} as primary`}
                className="rounded-md px-1.5 py-1 text-xs text-white/65 hover:bg-white/10 hover:text-white"
              >
                Set primary
              </button>
            )}
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
      {reorderError && (
        <p className="mx-4 mb-3 rounded-md border border-red-300/30 bg-red-500/15 px-2.5 py-1.5 text-xs text-red-100">
          {reorderError}
        </p>
      )}
      {primaryError && (
        <p className="mx-4 mb-3 rounded-md border border-red-300/30 bg-red-500/15 px-2.5 py-1.5 text-xs text-red-100">
          {primaryError}
        </p>
      )}
      <p className="sr-only" aria-live="polite">
        {primaryAnnouncement}
      </p>
    </div>
  );
}
