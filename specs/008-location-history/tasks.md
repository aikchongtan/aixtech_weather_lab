---

description: "Dependency-ordered implementation tasks for Task 8: Location history and charts"
---

# Tasks: Location history and charts

**Input**: Design documents from `/specs/008-location-history/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [API contract](./contracts/location-history.openapi.yaml), [test strategy](./test-strategy.md), and [manual acceptance plan](./manual-acceptance.md)

**Tests**: The 12 existing tests are protected. All new test tasks are additive; no existing test may be removed, renamed, merged, weakened, skipped, or made undiscoverable.

**Organization**: Tasks are grouped by user story. Phase 2 is intentionally shared because durable history is required by both P1 stories.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel after its stated dependencies complete and without editing the same file.
- **[US#]**: User-story traceability label.

## Phase 1: Setup and baseline

**Purpose**: Record the protected baseline and establish the approved implementation inputs.

- [ ] T001 Record the current verbose Vitest inventory (exactly 12 tests: 5 route and 7 weather-client) before changes; preserve it in the implementation validation notes using `backend/src/routes/locations.test.ts` and `backend/src/weather.test.ts`.
- [ ] T002 [P] Add only the approved frontend dependencies, `react-router-dom` and `recharts`, in `frontend/package.json` and the repository `package-lock.json`; do not add any other dependency.
- [ ] T003 [P] Inspect direct `/locations/:id` handling in development and the compiled production host using `frontend/vite.config.ts`, `frontend/src/main.tsx`, `backend/src/server.ts`, and `README.md`; document whether a non-`/api/*` SPA fallback is necessary before changing hosting behavior.

---

## Phase 2: Foundational durable history (blocking prerequisite)

**Purpose**: Create the atomic, bounded history persistence and read boundary required by both P1 stories.

**⚠️ CRITICAL**: Complete this phase before wiring the detail route or chart UI.

- [ ] T004 Add the `weather_readings` Drizzle table in `backend/src/schema.ts` with `id`, cascading `location_id`, `recorded_at`, nullable `observed_at`, nullable `temperature_c`, nullable `rainfall_mm`, and nullable `humidity_percent`; define the composite `(location_id, recorded_at, id)` history-query index.
- [ ] T005 Generate and review the additive Drizzle migration in `backend/drizzle/` and its metadata in `backend/drizzle/meta/`; it must create only the approved history table/index/foreign key and must not alter unrelated schema.
- [ ] T006 Enable SQLite foreign-key enforcement in `backend/src/db.ts` and add database helpers for reading bounded location history.
- [ ] T007 Preserve the existing snapshot-persistence helper in `backend/src/db.ts` as the single route-facing write boundary. Make that helper internally create `recorded_at`, atomically update the latest location snapshot, insert exactly one `weather_readings` row, and prune to the newest 1,000 rows using `recorded_at DESC, id DESC`; failed writes must roll back all three operations.
- [ ] T008 Add `GET /api/locations/:locationId/history` in `backend/src/routes/locations.ts` per `specs/008-location-history/contracts/location-history.openapi.yaml`: default `limit=240`, cap valid oversized limits at 1,000, return invalid/non-positive limits as HTTP 400 `{ "detail": "..." }`, select by `recorded_at DESC, id DESC`, and return the selected window by `recorded_at ASC, id ASC` without provider payloads.
- [ ] T009 Extend `backend/src/routes/locations.test.ts` with additive persistence/route tests for atomic successful refreshes, failed refreshes with no history row, duplicate provider timestamps/values, retained null metrics, deletion cascade, and transaction rollback.
- [ ] T010 Extend `backend/src/routes/locations.test.ts` with deterministic history-query tests: default 240, cap at 1,000, a small-limit newest-window fixture, same-`recorded_at` `id` tie-breaking, oldest-first return order, HTTP 400 `{ "detail": "..." }`, and unknown/deleted location results.

**Checkpoint**: The dashboard’s current snapshot and durable history are consistent; the history contract is independently testable before any chart UI exists.

---

## Phase 3: User Story 2 — Preserve refresh history (Priority: P1)

**Goal**: Every successful persisted creation/refresh produces one ordered, bounded history event while the dashboard still uses the latest snapshot.

**Independent Test**: Create/refresh a location multiple times with duplicate provider timestamps and null optional metrics; verify distinct chronological readings, latest snapshot correctness, retention, and no history record after a failed refresh.

- [ ] T011 [US2] Verify the existing create and refresh flows in `backend/src/routes/locations.ts` continue to call the unchanged route-facing snapshot-persistence helper and each successful flow persists exactly one history row without changing their existing success/failure API behavior.
- [ ] T012 [US2] Run and expand the focused assertions in `backend/src/routes/locations.test.ts` so location creation and refresh each prove that one snapshot and one history reading persist together.
- [ ] T013 [US2] Run `npx vitest list --reporter=verbose` and `npm test`; confirm the original 12-test inventory remains present and all Task 8 tests are additive.

**Checkpoint**: User Story 2 is independently complete; no frontend route or chart is required to prove persistence integrity.

---

## Phase 4: User Story 1 — Review a location’s weather history (Priority: P1) 🎯 MVP

**Goal**: A selected dashboard location can open an accessible detail route displaying the three approved metrics over time.

**Independent Test**: With seeded history for one location, select it on the dashboard, choose View history, and confirm temperature, rainfall, and humidity charts plus an accessible textual/table equivalent show the API readings and nulls as unavailable gaps.

### Tests for User Story 1

- [ ] T014 [P] [US1] Add API-client/DTO coverage in the existing frontend test setup, if available, for the narrow history response in `frontend/src/api.ts` and `frontend/src/types.ts`; do not introduce a separate test framework if none exists.
- [ ] T015 [P] [US1] Add component/route coverage in the existing frontend test setup, if available, for View history navigation, explicit units, null gaps/unavailable text, loading, empty, and retryable failure states in the new detail components under `frontend/src/`.

### Implementation for User Story 1

- [ ] T016 [US1] Add typed `getLocation(id)` and response-validating `getLocationHistory(id, limit?)` helpers plus their DTO types in `frontend/src/api.ts` and `frontend/src/types.ts`; the history helper exposes only `recorded_at`, `observed_at`, `temperature_c`, `rainfall_mm`, and `humidity_percent`.
- [ ] T017 [US1] Add `BrowserRouter` and dashboard/detail routes in `frontend/src/main.tsx` and `frontend/src/App.tsx`; keep the dashboard as the existing shared shell.
- [ ] T018 [US1] Add the selected-dashboard View history action in `frontend/src/components/Hero.tsx`, navigating to `/locations/:id` without creating duplicate selected-location state.
- [ ] T019 [P] [US1] Create reusable accessible metric-chart and reading-table components under `frontend/src/components/` using Recharts: visible metric/unit labels, non-colour-only series identification, null gaps, and timestamp/value equivalents that do not require hover or a pointer.
- [ ] T020 [US1] Create the location-detail page under `frontend/src/pages/` (or the established component location) to load history, render the three chart sections, and provide explicit loading, empty-history, retryable request-failure, and dashboard return states.
- [ ] T021 [US1] Make the detail page responsive at narrow widths in the new detail/chart component files; ensure charts and reading equivalents remain readable without horizontal page overflow.

**Checkpoint**: User Story 1 is independently complete for a selected existing location with history, including keyboard/screen-reader access and unavailable data semantics.

---

## Phase 5: User Story 3 — Navigate safely to and from history (Priority: P2)

**Goal**: Direct detail URLs work safely, synchronize the existing dashboard store, and have clear not-found and return behavior.

**Independent Test**: Direct-load a valid `/locations/:id` in development and compiled production, verify `select(location.id)` synchronizes the existing store, then test unknown/deleted URLs and Back to dashboard.

- [ ] T022 [US3] In the detail route/page under `frontend/src/pages/` (or the established component location), use `getLocation(id)` on a direct valid route load, then call the existing store `select(location.id)`; do not introduce local selected-location state or resolve the route only from an already-loaded location list.
- [ ] T023 [US3] Add clear unknown/deleted not-found and keyboard-operable Back to dashboard states in the detail route/page under `frontend/src/pages/`.
- [ ] T024 [US3] Verify direct `/locations/:id` behavior in development and the compiled production host. If needed, make the smallest change in `backend/src/server.ts` or hosting configuration to serve the SPA shell only for non-`/api/*` navigation requests; retain API routing precedence.
- [ ] T025 [US3] Add frontend route coverage in the existing test setup, if available, for direct valid-url store synchronization and unknown/deleted detail URLs; otherwise record these as required checks in `specs/008-location-history/manual-acceptance.md` without adding a new framework.

**Checkpoint**: Valid and invalid direct detail URLs are safe, API routes are not intercepted, and users can return to the dashboard without disrupting existing state.

---

## Phase 6: Polish, validation, and regression protection

**Purpose**: Validate the full feature without regressions to previously completed tasks.

- [ ] T026 [P] Verify the exact response shape and privacy boundary against `specs/008-location-history/contracts/location-history.openapi.yaml`; confirm no provider payloads, provider errors, station identifiers, or current-only values enter the history API.
- [ ] T027 [P] Run the full manual acceptance plan in `specs/008-location-history/manual-acceptance.md`, including controlled seeded retention checks, same-time ordering, keyboard/screen-reader review, narrow viewport layout, development/production direct routes, and the dashboard regression sweep.
- [ ] T028 Run `npx vitest list --reporter=verbose`, `npm test`, `npm run build`, `npm run doctor` (with the development server if required), and `git diff --check`; report the retained baseline and additive test count.
- [ ] T029 Inspect the final diff for scope: only approved dependencies, history schema/migration, persistence/route/UI/tests, and necessary SPA fallback behavior may change; do not commit or push.

## Dependencies and execution order

```text
Phase 1 ──> Phase 2 ──> US2 (Phase 3) ──> US1 (Phase 4) ──> US3 (Phase 5) ──> Phase 6
                         durable history       charts/detail       direct-route safety
```

- Phase 2 blocks both P1 stories because it establishes the persisted history and its read contract.
- US2 must complete before US1’s live history display is meaningful.
- US1 establishes the detail route before US3 adds direct-load synchronization and hosting validation.
- The direct-route hosting inspection in T003 may run in parallel with setup; any fallback implementation waits for T017.

## Parallel opportunities

- T002 and T003 can run in parallel after the baseline is recorded.
- T009 and T010 can be prepared in parallel after T004–T008 establish the schema and route surface, but both edit `backend/src/routes/locations.test.ts`; coordinate or serialize their edits.
- T014 and T015 can run in parallel if the frontend test harness exists and each uses separate test files.
- T019 can proceed in parallel with early detail-page structure after T016 defines the DTOs, but must finish before T020 integrates the charts.
- T026 and T027 can run in parallel after all implementation tasks are complete.

## Implementation strategy

### MVP first

1. Complete Phases 1 and 2.
2. Complete US2 to prove atomic, bounded persistence and the history endpoint.
3. Complete US1 to deliver the selected-location history page with accessible charts.
4. Stop and validate the independent US1/US2 criteria before direct-route polish.

### Incremental delivery

1. Durable history and API: protects refresh data before it has a new UI.
2. Detail charts: delivers the user-facing history capability.
3. Direct-route synchronization and hosting: makes bookmarked/deleted URLs safe.
4. Full regression and accessibility validation: preserves all completed weather-starter features.
