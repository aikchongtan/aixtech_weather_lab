import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { listForecastAreas } from '../api';
import { useStore } from '../state/store';
import type { ForecastArea } from '../types';
import { LocationIcon, PlusIcon, SearchIcon } from './icons';

const areaListboxId = 'forecast-area-options';

export function AddLocationForm() {
  const { isAdding, setAdding, create } = useStore();
  const [areas, setAreas] = useState<ForecastArea[]>([]);
  const [areasLoading, setAreasLoading] = useState(false);
  const [areasError, setAreasError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState<ForecastArea | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadAreas = async () => {
    setAreasLoading(true);
    setAreasError(null);
    try {
      const response = await listForecastAreas();
      setAreas(response.areas);
    } catch {
      setAreas([]);
      setAreasError('Singapore areas are unavailable. Please try again.');
    } finally {
      setAreasLoading(false);
    }
  };

  useEffect(() => {
    if (isAdding) void loadAreas();
  }, [isAdding]);

  const filteredAreas = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return areas;
    return areas.filter((area) => area.name.toLocaleLowerCase().includes(normalizedQuery));
  }, [areas, query]);

  const isPending = submitting || locating;

  const selectArea = (area: ForecastArea) => {
    setSelectedArea(area);
    setQuery(area.name);
    setIsPickerOpen(false);
    setActiveIndex(-1);
    setSubmitError(null);
  };

  const cancel = () => {
    setQuery('');
    setSelectedArea(null);
    setIsPickerOpen(false);
    setActiveIndex(-1);
    setAreasError(null);
    setSubmitError(null);
    setAdding(false);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedArea) {
      setSubmitError('Select a Singapore area before adding it.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      await create({ latitude: selectedArea.latitude, longitude: selectedArea.longitude });
      cancel();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not add location');
    } finally {
      setSubmitting(false);
    }
  };

  const onUseMyLocation = () => {
    if (isPending) return;

    if (!navigator.geolocation) {
      setSubmitError('Your browser does not support location detection. Select an area instead.');
      return;
    }

    setLocating(true);
    setSubmitError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await create({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          cancel();
        } catch (err) {
          setSubmitError(err instanceof Error ? err.message : 'Could not add your location');
        } finally {
          setLocating(false);
        }
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setSubmitError('Location permission was denied. Select an area instead.');
        } else if (error.code === error.TIMEOUT) {
          setSubmitError('Location detection timed out. Please try again or select an area.');
        } else {
          setSubmitError('Your location is unavailable. Please try again or select an area.');
        }
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  };

  const onPickerKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setIsPickerOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (filteredAreas.length === 0) return;
      setIsPickerOpen(true);
      setActiveIndex((current) => {
        if (event.key === 'ArrowDown') return Math.min(current + 1, filteredAreas.length - 1);
        return current <= 0 ? 0 : current - 1;
      });
      return;
    }

    if (event.key === 'Enter' && isPickerOpen && activeIndex >= 0) {
      event.preventDefault();
      selectArea(filteredAreas[activeIndex]);
    }
  };

  if (!isAdding) {
    return (
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.07] px-3 py-2.5 text-sm font-medium text-white/85 backdrop-blur-xl hover:bg-white/[0.12]"
      >
        <PlusIcon />
        <span>Add Location</span>
      </button>
    );
  }

  const activeOptionId = activeIndex >= 0 ? `${areaListboxId}-${activeIndex}` : undefined;

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-2.5 rounded-2xl border border-white/15 bg-white/[0.1] p-3 backdrop-blur-xl"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
        Singapore area
      </p>
      <div className="grid gap-1">
        <label htmlFor="forecast-area-search" className="text-[11px] text-white/60">
          Search for an area
        </label>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
          <input
            id="forecast-area-search"
            type="text"
            value={query}
            onChange={(event) => {
              const nextQuery = event.target.value;
              const hasMatchingArea = areas.some((area) =>
                area.name.toLocaleLowerCase().includes(nextQuery.trim().toLocaleLowerCase()),
              );
              setQuery(nextQuery);
              setSelectedArea(null);
              setIsPickerOpen(true);
              setActiveIndex(hasMatchingArea ? 0 : -1);
            }}
            onFocus={() => setIsPickerOpen(true)}
            onKeyDown={onPickerKeyDown}
            disabled={areasLoading || Boolean(areasError) || isPending}
            role="combobox"
            aria-autocomplete="list"
            aria-controls={areaListboxId}
            aria-expanded={isPickerOpen && filteredAreas.length > 0}
            aria-activedescendant={activeOptionId}
            placeholder={areasLoading ? 'Loading areas…' : 'Search Singapore areas'}
            className="w-full rounded-md border border-white/15 bg-white/10 py-1.5 pl-8 pr-2 text-sm text-white placeholder:text-white/40 disabled:cursor-not-allowed disabled:opacity-60"
          />
          {isPickerOpen && !areasLoading && !areasError && (
            <div
              id={areaListboxId}
              role="listbox"
              aria-label="Singapore areas"
              style={{ minHeight: 0, maxHeight: '11rem', overflowY: 'auto' }}
              className="mt-1 w-full rounded-md border border-white/15 bg-slate-900 py-1 shadow-lg"
            >
              {filteredAreas.length === 0 ? (
                <p className="px-3 py-2 text-xs text-white/60">No matching areas</p>
              ) : (
                filteredAreas.map((area, index) => (
                  <button
                    key={`${area.name}-${area.latitude}-${area.longitude}`}
                    id={`${areaListboxId}-${index}`}
                    type="button"
                    role="option"
                    aria-selected={selectedArea?.name === area.name}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectArea(area)}
                    className={`block w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10 ${
                      index === activeIndex ? 'bg-white/15' : ''
                    }`}
                  >
                    {area.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
      {areasError && (
        <div className="flex items-center justify-between gap-2 rounded-md border border-red-300/30 bg-red-500/15 px-2.5 py-1.5 text-xs text-red-100">
          <span>{areasError}</span>
          <button
            type="button"
            onClick={() => void loadAreas()}
            disabled={areasLoading}
            className="font-semibold underline disabled:cursor-not-allowed disabled:opacity-60"
          >
            Retry
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={onUseMyLocation}
        disabled={isPending}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-white/15 bg-white/[0.07] px-3 py-2 text-xs font-medium text-white/85 hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <LocationIcon className="h-4 w-4" />
        <span>{locating ? 'Finding your location…' : 'Use my location'}</span>
      </button>
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={cancel}
          className="rounded-md px-2.5 py-1.5 text-xs font-medium text-white/70 hover:text-white"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!selectedArea || areasLoading || Boolean(areasError) || isPending}
          className="rounded-md bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Adding…' : 'Add'}
        </button>
      </div>
      {submitError && (
        <p className="rounded-md border border-red-300/30 bg-red-500/15 px-2.5 py-1.5 text-xs text-red-100">
          {submitError}
        </p>
      )}
    </form>
  );
}
