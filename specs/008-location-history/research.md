# Research and decisions: Location history and charts

## Decision 1: Retain one record for every successful snapshot write

**Decision**: Insert a history row for every successful persisted refresh, including duplicate provider timestamps, duplicate values, and rows in which any or all optional chart metrics are null.

**Rationale**: An application refresh is the event being recorded. Provider timestamps and metric equality cannot safely identify a duplicate refresh, and omitting null-valued records would distort the timeline.

**Rejected**: Deduplicating by provider timestamp or metric values; this violates the approved retention rule.

## Decision 2: Keep a bounded SQLite history table

**Decision**: Add `weather_readings` with a foreign key to `locations`, retaining the newest 1,000 rows per location.

**Rationale**: The existing snapshot is intentionally current-state storage. A separate narrow table keeps history queryable without putting JSON time series into the current snapshot or fetching providers during rendering.

**Rejected**: Extending `locations` with a JSON array, which complicates bounded retention and querying; calling providers from the detail page, which would not reflect prior refreshes.

## Decision 3: Make persistence atomic and deletion referentially safe

**Decision**: Enable `PRAGMA foreign_keys = ON` on the SQLite connection. Within exactly one SQLite transaction: update the location's latest snapshot, insert one history row, then delete rows outside the newest 1,000 for that location, ordered by `recorded_at DESC, id DESC`.

**Rationale**: A visible latest snapshot must always have its corresponding history event, and pruning cannot leave an incomplete durable state. `ON DELETE CASCADE` prevents orphaned readings when the current delete flow removes a location.

**Rejected**: Separate writes or best-effort pruning, which can leave the snapshot/history out of sync after a failure; manual deletion in the route, which is less reliable than the database relationship.

## Decision 4: Use application time for ordering

**Decision**: Store `recorded_at` for the successful local persistence event and optional `observed_at` from the provider. Retention and window selection order by `recorded_at DESC, id DESC`; returned windows order by `recorded_at ASC, id ASC`.

**Rationale**: Provider observation times may repeat, be absent, or arrive out of order. The history requirement deliberately preserves repeated provider timestamps.

**Implementation note**: `id` is mandatory as the stable secondary key, so same-recorded-time rows have deterministic retention, selection, and output order.

## Decision 5: Expose a narrow read contract

**Decision**: Provide `GET /api/locations/:locationId/history?limit=…`, defaulting to 240 and returning at most 1,000 newest retained readings in oldest-first order. Values are only recorded time, optional observed time, `temperature_c`, `rainfall_mm`, and `humidity_percent`.

**Rationale**: It supplies the detail page without exposing external payloads, provider errors, stations, current-only data, or database columns unrelated to the charts.

**Limit rule**: A positive integer limit above 1,000 is capped at 1,000. Missing limit defaults to 240. Invalid/non-positive limits return HTTP 400 as `{ "detail": "…" }`; an unknown/deleted location returns not found.

## Decision 6: Add routing without duplicating selection state

**Decision**: Use the approved `react-router-dom` package and `BrowserRouter`. The selected dashboard location gets a “View history” navigation action to `/locations/:id`; the detail page resolves its route id and reads history through the API. On direct load of an existing location, it synchronizes the existing store via `select(location.id)` rather than creating parallel selected-location state.

**Rationale**: A real URL supports direct navigation, refresh, unknown/deleted handling, and an explicit path back to the dashboard.

**Hosting check**: Verify `/locations/:id` loads in development and from the compiled production build. If either host lacks SPA fallback, add the smallest server/static-host rule that returns the frontend shell only for non-`/api/*` navigation requests; API routes must always continue to reach the backend.

## Decision 7: Use Recharts plus a textual equivalent

**Decision**: Use the approved `recharts` package for three independently labelled responsive line charts. Each chart has a visible title/unit, non-colour-only identification, null data gaps, and a screen-reader-accessible table or textual reading list containing the timestamps and values.

**Rationale**: Recharts provides responsive SVG chart primitives without implementing chart geometry from scratch. A chart alone is not an adequate accessible data representation.

**Rejected**: Canvas-only rendering without an equivalent, hover-only data disclosure, or substituting null values with zero.

## Decision 8: Degrade locally, not globally

**Decision**: History loading states are local to the detail route: explicit loading, retryable request failure, empty history, and not-found views. Existing dashboard operations remain usable through the shared shell.

**Rationale**: A history request failure must not hide the latest snapshot or prevent refresh, deletion, maps, picker, forecasts, and wind from continuing to work.
