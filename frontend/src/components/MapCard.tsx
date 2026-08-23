import { useEffect, useRef, useState } from 'react';
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useStore } from '../state/store';
import type { Location } from '../types';
import { CloseIcon, LocationIcon } from './icons';
import { formatTemperature } from './format';

const singaporeCenter: [number, number] = [1.3521, 103.8198];
const singaporeBounds: [[number, number], [number, number]] = [
  [1.16, 103.59],
  [1.48, 104.05],
];

function locationLabel(location: Location): string {
  const area = location.weather.area ?? 'Saved location';
  const condition = location.weather.condition ?? 'Conditions unavailable';
  return `${area}, ${condition}, ${formatTemperature(location.weather.temperature_c)} degrees`;
}

function MapViewport({ expanded }: { expanded: boolean }) {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();
  }, [expanded, map]);

  return null;
}

interface LocationMapProps {
  expanded: boolean;
  onTileUnavailable: () => void;
}

function LocationMap({ expanded, onTileUnavailable }: LocationMapProps) {
  const { locations, selectedId, select } = useStore();

  return (
    <div className={expanded ? 'h-[min(72vh,48rem)]' : 'h-64'}>
      <MapContainer
        center={singaporeCenter}
        zoom={11}
        minZoom={10}
        maxBounds={singaporeBounds}
        className="h-full w-full"
        aria-label="Map of saved Singapore weather locations"
      >
        <MapViewport expanded={expanded} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          eventHandlers={{ tileerror: onTileUnavailable }}
        />
        {locations.map((location) => {
          const selected = location.id === selectedId;
          return (
            <CircleMarker
              key={location.id}
              center={[location.latitude, location.longitude]}
              radius={selected ? 10 : 8}
              pathOptions={{
                color: selected ? '#fef3c7' : '#e0f2fe',
                weight: selected ? 3 : 2,
                fillColor: selected ? '#f59e0b' : '#0ea5e9',
                fillOpacity: 0.9,
              }}
              eventHandlers={{ click: () => select(location.id) }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                <span>{locationLabel(location)}</span>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}

export function MapCard() {
  const { locations, selectedId, select } = useStore();
  const [expanded, setExpanded] = useState(false);
  const [tilesUnavailable, setTilesUnavailable] = useState(false);
  const expandButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  const close = () => {
    setExpanded(false);
    requestAnimationFrame(() => expandButtonRef.current?.focus());
  };

  useEffect(() => {
    if (!expanded) return;

    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key === 'Tab') {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [expanded]);

  if (locations.length === 0) return null;

  return (
    <>
      <section className="overflow-hidden rounded-3xl border border-white/15 bg-slate-950/25 shadow-xl shadow-sky-950/20 backdrop-blur-xl">
        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
              <LocationIcon className="h-3.5 w-3.5" />
              <span>Saved locations</span>
            </div>
            <p className="mt-1 text-sm text-white/80">Select a pin to view its weather.</p>
          </div>
          <button
            ref={expandButtonRef}
            type="button"
            onClick={() => setExpanded(true)}
            aria-label="Expand saved locations map"
            className="rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-xs font-semibold text-white/90 hover:bg-white/[0.15]"
          >
            Expand map
          </button>
        </header>
        {tilesUnavailable && (
          <p className="border-b border-amber-200/20 bg-amber-200/10 px-4 py-2 text-xs text-amber-50">
            Map tiles are unavailable. Saved location pins remain selectable.
          </p>
        )}
        <LocationMap expanded={false} onTileUnavailable={() => setTilesUnavailable(true)} />
        <div className="flex flex-wrap gap-2 border-t border-white/10 px-4 py-3">
          {locations.map((location) => (
            <button
              key={location.id}
              type="button"
              onClick={() => select(location.id)}
              aria-pressed={location.id === selectedId}
              className={`rounded-full px-3 py-1 text-xs transition ${
                location.id === selectedId
                  ? 'bg-sky-200 text-slate-950'
                  : 'bg-white/[0.08] text-white/80 hover:bg-white/[0.14]'
              }`}
            >
              {location.weather.area ?? 'Saved location'}
            </button>
          ))}
        </div>
      </section>

      {expanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="expanded-map-title"
            className="w-full max-w-6xl overflow-hidden rounded-3xl border border-white/20 bg-slate-950 shadow-2xl shadow-black/50"
          >
            <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div>
                <h2 id="expanded-map-title" className="text-lg font-semibold text-white">
                  Saved locations map
                </h2>
                <p className="text-sm text-white/65">Select a pin to view its weather.</p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={close}
                aria-label="Close saved locations map"
                className="rounded-full p-2 text-white/75 hover:bg-white/10 hover:text-white"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </header>
            {tilesUnavailable && (
              <p className="border-b border-amber-200/20 bg-amber-200/10 px-4 py-2 text-xs text-amber-50">
                Map tiles are unavailable. Saved location pins remain selectable.
              </p>
            )}
            <LocationMap expanded onTileUnavailable={() => setTilesUnavailable(true)} />
          </section>
        </div>
      )}
    </>
  );
}
