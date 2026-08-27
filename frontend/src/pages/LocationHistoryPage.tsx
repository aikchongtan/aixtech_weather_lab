import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getLocation, getLocationHistory } from '../api';
import { MetricChart } from '../components/MetricChart';
import { ReadingsTable } from '../components/ReadingsTable';
import { Sidebar } from '../components/Sidebar';
import { useStore } from '../state/store';
import type { Location, LocationHistory } from '../types';

type PageState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'error'; error: unknown }
  | { status: 'ready'; location: Location; history: LocationHistory };

const ACTION_CLASS =
  'inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-xs font-medium text-white/85 backdrop-blur-xl hover:bg-white/[0.14]';

function locationLabel(loc: Location): string {
  return loc.weather.area ?? `${loc.latitude.toFixed(3)}, ${loc.longitude.toFixed(3)}`;
}

export function LocationHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const { select } = useStore();
  const [state, setState] = useState<PageState>({ status: 'loading' });

  const locationId = Number(id);

  const load = useCallback(async () => {
    if (!Number.isInteger(locationId) || locationId < 1) {
      setState({ status: 'not-found' });
      return;
    }
    setState({ status: 'loading' });
    try {
      const location = await getLocation(locationId);
      if (!location) {
        setState({ status: 'not-found' });
        return;
      }
      select(location.id);
      const history = await getLocationHistory(locationId);
      if (!history) {
        setState({ status: 'not-found' });
        return;
      }
      setState({ status: 'ready', location, history });
    } catch (error) {
      setState({ status: 'error', error });
    }
  }, [locationId, select]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex min-h-screen w-full flex-col lg:h-screen lg:flex-row">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 p-4 sm:p-6 lg:p-8">

          {state.status === 'loading' && (
            <div className="flex flex-1 items-center justify-center py-24">
              <p className="text-sm text-white/60" role="status" aria-live="polite">
                Loading history…
              </p>
            </div>
          )}

          {state.status === 'not-found' && (
            <div className="flex flex-col items-center gap-4 py-24 text-center">
              <p className="text-2xl font-light text-white/85">Location not found</p>
              <p className="text-sm text-white/60">
                This location may have been deleted or the link may be incorrect.
              </p>
              <Link to="/" className={ACTION_CLASS}>
                Back to dashboard
              </Link>
            </div>
          )}

          {state.status === 'error' && (
            <div className="flex flex-col items-center gap-4 py-24 text-center">
              <p className="text-2xl font-light text-white/85">Could not load history</p>
              <p className="text-sm text-white/60">
                History is temporarily unavailable. Please try again.
              </p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => void load()} className={ACTION_CLASS}>
                  Try again
                </button>
                <Link to="/" className={ACTION_CLASS}>
                  Back to dashboard
                </Link>
              </div>
            </div>
          )}

          {state.status === 'ready' && (
            <>
              <header className="rounded-3xl border border-white/10 bg-slate-950/15 px-4 pb-5 pt-7 text-center shadow-xl shadow-sky-950/10 backdrop-blur-xl sm:px-8">
                <h1 className="text-3xl font-light leading-tight text-white sm:text-4xl">
                  {locationLabel(state.location)}
                </h1>
                <p className="mt-2 text-sm text-white/60">Weather history</p>
              </header>

              <div>
                <Link to="/" className={ACTION_CLASS}>
                  ← Back to dashboard
                </Link>
              </div>

              {state.history.readings.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.04] py-16 text-center">
                  <p className="text-base text-white/85">No history recorded yet</p>
                  <p className="text-sm text-white/60">
                    A reading is saved each time weather is successfully refreshed.
                  </p>
                </div>
              ) : (
                <>
                  <MetricChart
                    readings={state.history.readings}
                    metric="temperature_c"
                    label="Temperature"
                    unit="°C"
                    color="#60a5fa"
                  />
                  <MetricChart
                    readings={state.history.readings}
                    metric="rainfall_mm"
                    label="Rainfall"
                    unit="mm"
                    color="#34d399"
                  />
                  <MetricChart
                    readings={state.history.readings}
                    metric="humidity_percent"
                    label="Humidity"
                    unit="%"
                    color="#a78bfa"
                  />
                  <ReadingsTable readings={state.history.readings} />
                </>
              )}
            </>
          )}

        </div>
      </main>
    </div>
  );
}
