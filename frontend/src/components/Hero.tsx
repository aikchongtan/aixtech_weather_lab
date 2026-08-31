import { Link } from 'react-router-dom';
import { useRef, type TouchEvent } from 'react';
import { useStore, useSelectedLocation } from '../state/store';
import { ChevronLeftIcon, ChevronRightIcon, LocationIcon, RefreshIcon } from './icons';
import { HourlyStrip } from './HourlyStrip';
import { TenDayForecast } from './TenDayForecast';
import { TileGrid } from './Tiles';
import { MapCard } from './MapCard';
import { formatTemperature, formatTime } from './format';

function conditionAccent(condition: string): string {
  const normalized = condition.toLocaleLowerCase();
  if (normalized.includes('thunder')) return 'border-violet-200/35 bg-violet-950/20';
  if (normalized.includes('rain') || normalized.includes('shower')) {
    return 'border-sky-200/35 bg-sky-950/20';
  }
  if (normalized.includes('fair') || normalized.includes('sun')) {
    return 'border-amber-100/40 bg-amber-950/20';
  }
  return 'border-white/10 bg-slate-950/15';
}

export function Hero() {
  const { locations, refresh, refreshingId, select } = useStore();
  const selected = useSelectedLocation();
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  if (!selected) {
    return (
      <main className="flex min-w-0 flex-1 flex-col p-6 lg:p-10">
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <p className="text-2xl font-light text-white/85">Select a location</p>
            <p className="mt-2 text-sm text-white/60">
              Add a Singapore coordinate from the sidebar to see its weather.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const isHome = locations[0]?.id === selected.id;
  const area =
    selected.weather?.area || `${selected.latitude.toFixed(3)}, ${selected.longitude.toFixed(3)}`;
  const condition = selected.weather?.condition || 'Conditions unavailable';
  const observed = formatTime(selected.weather?.observed_at);
  const validPeriod = selected.weather?.valid_period_text;
  const source = selected.weather?.source;
  const isRefreshing = refreshingId === selected.id;
  const temperature = formatTemperature(selected.weather?.temperature_c);
  const high = formatTemperature(selected.weather?.forecast_high_c);
  const low = formatTemperature(selected.weather?.forecast_low_c);
  const selectedIndex = Math.max(0, locations.findIndex((location) => location.id === selected.id));
  const previousLocation = locations[(selectedIndex - 1 + locations.length) % locations.length];
  const nextLocation = locations[(selectedIndex + 1) % locations.length];
  const canNavigate = locations.length >= 2;
  const locationName = (location: (typeof locations)[number]) =>
    location.weather.area || `${location.latitude.toFixed(3)}, ${location.longitude.toFixed(3)}`;

  const navigate = (direction: 'previous' | 'next') => {
    if (!canNavigate) return;
    const nextIndex =
      direction === 'next'
        ? (selectedIndex + 1) % locations.length
        : (selectedIndex - 1 + locations.length) % locations.length;
    select(locations[nextIndex]!.id);
  };

  const onTouchStart = (event: TouchEvent<HTMLElement>) => {
    if (!(event.target instanceof Element) || event.target.closest('button, a, input, select, textarea, [role="button"]')) {
      touchStart.current = null;
      return;
    }
    const touch = event.touches[0];
    if (touch) touchStart.current = { x: touch.clientX, y: touch.clientY };
  };

  const onTouchEnd = (event: TouchEvent<HTMLElement>) => {
    const start = touchStart.current;
    touchStart.current = null;
    const touch = event.changedTouches[0];
    if (!start || !touch || !canNavigate) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) > Math.abs(deltaY) * 2 && Math.abs(deltaX) > 40) {
      navigate(deltaX < 0 ? 'next' : 'previous');
    }
  };

  return (
    <main
      className="min-w-0 flex-1 overflow-y-auto"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 p-4 sm:p-6 lg:p-8">
        <header className={`rounded-3xl border px-4 pb-5 pt-7 text-center shadow-xl shadow-sky-950/10 backdrop-blur-xl sm:px-8 ${conditionAccent(condition)}`}>
          <div className="mb-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => navigate('previous')}
              aria-label={canNavigate ? `Previous location: ${locationName(previousLocation!)}` : 'Previous location'}
              aria-disabled={!canNavigate}
              className="rounded-full border border-white/15 bg-white/[0.08] p-2 text-white/85 hover:bg-white/[0.14] aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
            >
              <ChevronLeftIcon className="h-4 w-4" />
              <span className="sr-only">Previous location</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('next')}
              aria-label={canNavigate ? `Next location: ${locationName(nextLocation!)}` : 'Next location'}
              aria-disabled={!canNavigate}
              className="rounded-full border border-white/15 bg-white/[0.08] p-2 text-white/85 hover:bg-white/[0.14] aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
            >
              <ChevronRightIcon className="h-4 w-4" />
              <span className="sr-only">Next location</span>
            </button>
          </div>
          {isHome && (
            <div className="mb-2 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
              <LocationIcon className="h-3 w-3" />
              <span>Home</span>
            </div>
          )}
          <h1 className="text-3xl font-light leading-tight text-white sm:text-4xl">{area}</h1>
          <div className="mt-2 text-7xl font-extralight leading-none tracking-tight text-white sm:text-[6.5rem]">
            {temperature}
          </div>
          <div className="mt-1 text-lg text-white/90">{condition}</div>
          <div className="mt-1 text-sm text-white/70 tabular-nums">
            H:{high} L:{low}
          </div>
          {observed && <div className="mt-3 text-xs text-white/55">Updated {observed}</div>}
        </header>

        {validPeriod && (
          <p className="px-2 pb-1 text-center text-xs text-white/65">{validPeriod}</p>
        )}

        <HourlyStrip periods={selected.weather?.forecast_periods} />
        <TenDayForecast weather={selected.weather} />
        <TileGrid weather={selected.weather} />
        <MapCard />

        <footer className="mt-2 flex flex-col items-center gap-3 pb-8 text-xs text-white/55">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void refresh(selected.id)}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-xs font-medium text-white/85 backdrop-blur-xl hover:bg-white/[0.14] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshIcon className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Refreshing…' : 'Refresh'}</span>
            </button>
            <Link
              to={`/locations/${selected.id}`}
              className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-xs font-medium text-white/85 backdrop-blur-xl hover:bg-white/[0.14]"
            >
              View history
            </Link>
          </div>
          <p>
            Weather for {area}
            {source ? ` · ${source}` : ''}
          </p>
        </footer>
      </div>
    </main>
  );
}
