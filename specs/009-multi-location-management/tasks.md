---

description: "Dependency-ordered implementation tasks for Feature 9: Multi-location management"
---

# Tasks: Multi-location management

**Input**: Design documents from `specs/009-multi-location-management/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [API contract](./contracts/multi-location-management.openapi.yaml), [quickstart.md](./quickstart.md)

**Tests**: The 18 existing tests are protected. All new test tasks are additive; no existing test may be removed, renamed, merged, weakened, skipped, or made undiscoverable.

**Primary invariant**: Exactly one location carries `is_primary = 1` at all times when any locations are saved; zero rows carry it when the table is empty. This invariant must hold after every create, delete, reorder, and primary-change operation.

**Reorder interface**: Direction-only. `PATCH /api/locations/:id/order` accepts `{ "direction": "up" | "down" }` exclusively. No absolute sort-order endpoint.

**Organization**: Tasks are grouped by user story. Phase 2 is intentionally shared because the schema migration and invariant DB layer are required by all three user stories.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel after its stated dependencies complete and without editing the same file.
- **[US#]**: User-story traceability label.

## Phase 1: Setup and baseline

**Purpose**: Record the protected test baseline before any changes.

- [X] T001 Record the current verbose Vitest inventory (18 tests: 12 original + 6 Feature 8 additive) before any changes; confirm `npm test` is green and `git diff --check` is clean.

---

## Phase 2: Foundational — Schema, migration, and invariant DB layer

**Purpose**: Add the `sort_order` and `is_primary` columns, generate the migration, and enforce the primary invariant in every existing write path. Nothing in Phases 3–5 can begin until this phase is complete and the migration has been validated through the application's startup migrator.

**⚠️ CRITICAL**: Complete this phase before any user-story implementation. The primary invariant must hold from the first migrated row.

- [X] T002 Add `sort_order INTEGER NOT NULL DEFAULT 0` and `is_primary INTEGER NOT NULL DEFAULT 0` columns to the `locations` table definition in `backend/src/schema.ts`; no other table or column changes.
- [X] T003 Generate and review the additive Drizzle migration in `backend/drizzle/` and its metadata in `backend/drizzle/meta/`; the migration must (a) add both columns, (b) backfill `sort_order = id` for all existing rows to preserve creation order, and (c) set `is_primary = 1` for the existing row with the lowest `id`; it must not alter any other column or table. Validate by running `npm test` (the test suite applies the migration to a fresh temp database on each run via the application's sqlite-proxy startup migrator) and by running `npm run reset && npm run dev` to apply it to a clean development database, confirming `GET /api/locations` responds correctly. Do not use `npm run db:migrate`; the project's Drizzle Kit command lacks the optional SQLite driver required by that subcommand.
- [ ] T004 Update `createLocation` in `backend/src/db.ts` to wrap the insert in a single `db.transaction()` that: (a) queries whether the `locations` table is currently empty and obtains `MAX(sort_order)` in one step; (b) derives `sort_order = (MAX(sort_order) ?? 0) + 1` and `is_primary = table_was_empty ? 1 : 0`; (c) inserts the new row with those values; all three operations commit together so no race can observe a partially-written state.
- [ ] T005 Update `deleteLocation` in `backend/src/db.ts` to perform its delete inside a transaction that, when the deleted location had `is_primary = 1` and at least one other row remains, immediately sets `is_primary = 1` on the remaining row with the lowest `sort_order`; when the table becomes empty, no further action is needed.
- [ ] T006 Update `listLocations` in `backend/src/db.ts` to select `is_primary` and to order results by `is_primary DESC, sort_order ASC`; update the Location query return type to include `is_primary` so it flows through to JSON responses.
- [ ] T007 Verify that `is_primary` appears in the JSON response from all location-returning routes in `backend/src/routes/locations.ts` (`GET /api/locations`, `POST /api/locations`, `GET /api/locations/:id`, `POST /api/locations/:id/refresh`); add explicit field mapping if Drizzle does not automatically surface the column.
- [ ] T008 [P] Add `is_primary: boolean` to the `Location` interface in `frontend/src/types.ts`; this can run in parallel with T002–T007 since it is a frontend-only file.

**Checkpoint**: `npm test` passes with all 18 original tests (migration applied to fresh temp database by the startup migrator); `npm run reset && npm run dev` starts cleanly; `GET /api/locations` returns an empty array (no existing rows) or locations ordered primary-first, each with `is_primary: true/false`; the primary invariant holds for all existing create and delete paths.

---

## Phase 3: User Story 1 — Reorder saved locations (Priority: P1) 🎯 MVP

**Goal**: Users can move any non-primary location one position up or down via explicit sidebar controls; the new order persists across reloads.

**Independent Test**: Add three locations (A, B, C). Move B down. Reload. Confirm order is A, C, B. Move C up. Reload. Confirm order is A, C, B with C now in position 1 relative to non-primaries.

### Tests for User Story 1

- [ ] T009 [P] [US1] Add additive tests for `PATCH /api/locations/:id/order` in `backend/src/routes/locations.test.ts`: (a) move-up success swaps sort_order with the adjacent lower location and returns the updated list; (b) move-down success swaps with the adjacent higher location; (c) move-up on the first non-primary returns 409; (d) move-down on the last returns 409; (e) any direction on the primary returns 409; (f) unknown `locationId` returns 404; (g) invalid or missing `direction` returns 400; (h) all 18 original tests remain present and passing.

### Implementation for User Story 1

- [ ] T010 [US1] Add `reorderLocation(id: number, direction: 'up' | 'down')` to `backend/src/db.ts` returning a discriminated outcome: (a) fetch all non-primary locations ordered by `sort_order ASC`; (b) if the id is not found in the full locations table, return `{ outcome: 'not_found' }`; if the id exists but `is_primary = 1`, return `{ outcome: 'primary' }`; (c) for "up", if the target is at index 0, return `{ outcome: 'boundary' }`; for "down", if at the last index, return `{ outcome: 'boundary' }`; (d) otherwise swap the two `sort_order` values atomically in a transaction and return `{ outcome: 'success', locations: [...] }` with the updated full list ordered `is_primary DESC, sort_order ASC`.
- [ ] T011 [US1] Add `PATCH /api/locations/:id/order` to `backend/src/routes/locations.ts` per `specs/009-multi-location-management/contracts/multi-location-management.openapi.yaml`: validate `locationId` is a positive integer; validate `direction` is `"up"` or `"down"` (400 otherwise); call `reorderLocation` and map its discriminated outcome to an HTTP response: `not_found` → 404, `primary` → 409, `boundary` → 409, `success` → 200 with `{ locations: [...] }`.
- [ ] T012 [P] [US1] Add `reorderLocation(id: number, direction: 'up' | 'down'): Promise<{ locations: Location[] }>` to `frontend/src/api.ts`; add `ChevronUpIcon` and `ChevronDownIcon` SVG components to `frontend/src/components/icons.tsx` (16 × 16 viewBox, matching the existing icon style).
- [ ] T013 [US1] Add `reorder(id: number, direction: 'up' | 'down'): Promise<void>` action to `frontend/src/state/store.tsx`: call `reorderLocation`, on success call `load()` to refresh the list, on failure set `error` and leave the list unchanged so the UI reverts.
- [ ] T014 [US1] Add Move up and Move down `<button>` elements to `frontend/src/components/SidebarCard.tsx`: (a) omit both buttons when `location.is_primary` is true (FR-015); (b) disable the Move up button when the location is at index 1 in the `locations` array (first non-primary cannot move above the pinned primary); (c) disable the Move down button when the location is at the last index; (d) `aria-label` each button with the area name (`"Move [area] up"` / `"Move [area] down"`); (e) call `reorder(location.id, direction)` on click; (f) stop click-event propagation to prevent triggering the card selection handler; (g) show a visible inline error when `reorder` fails.
- [ ] T015 [US1] Pass an `isFiltered` boolean (derived from the non-empty `query` state) from `frontend/src/components/Sidebar.tsx` down to each `SidebarCard`; when `isFiltered` is true, render both Move up and Move down as absent or visibly disabled so reorder actions are blocked during search (FR-005).

**Checkpoint**: Users can move non-primary locations up or down in the sidebar; controls are absent for the primary and at list boundaries; controls are absent during search; order persists across page reloads; 409 from the API reverts the UI.

---

## Phase 4: User Story 2 — Designate a primary location (Priority: P1)

**Goal**: Users can mark exactly one location as primary; it always appears first after every reload; deletion of the primary automatically promotes the next location.

**Independent Test**: With locations A (primary), B, C in order, set C as primary. Reload. Confirm C is first, then A and B in their previous relative order. Delete C. Reload. Confirm A (the next after C in pre-deletion order) is now primary at position 0.

### Tests for User Story 2

- [ ] T016 [P] [US2] Add additive tests for `POST /api/locations/:id/primary` in `backend/src/routes/locations.test.ts`: (a) sets the target as primary and clears the previous primary; (b) returns the full updated list with exactly one `is_primary: true`; (c) calling the endpoint again on the already-primary location is idempotent and returns 200; (d) unknown `locationId` returns 404.
- [ ] T017 [US2] Add additive invariant tests in `backend/src/routes/locations.test.ts`: (a) the first location created in an empty database has `is_primary: true`; (b) a second location added to a non-empty list has `is_primary: false`; (c) deleting the primary when other locations exist makes the next-lowest-sort_order location primary; (d) deleting the only location leaves no location with `is_primary: true`; (e) across a full create → set-primary → delete-primary → create cycle, exactly one row has `is_primary = 1` at every step where the table is non-empty.

### Implementation for User Story 2

- [ ] T018 [US2] Add `setPrimaryLocation(id: number)` to `backend/src/db.ts` returning a discriminated outcome: open one `db.transaction()` and, as the first operation inside it, SELECT the target row by id; if the row is absent, return `{ outcome: 'not_found' }` and let the transaction roll back without modifying any other row; only when the row is confirmed to exist within the same transaction, UPDATE all rows `is_primary = 0` then UPDATE the target row `is_primary = 1`; commit and return `{ outcome: 'success', locations: [...] }` with the updated full list ordered `is_primary DESC, sort_order ASC`.
- [ ] T019 [US2] Add `POST /api/locations/:id/primary` to `backend/src/routes/locations.ts` per `specs/009-multi-location-management/contracts/multi-location-management.openapi.yaml`: validate `locationId` is a positive integer; call `setPrimaryLocation`; return 404 for unknown location, 200 with `{ locations: [...] }` on success (idempotent).
- [ ] T020 [P] [US2] Add `setPrimaryLocation(id: number): Promise<{ locations: Location[] }>` to `frontend/src/api.ts`.
- [ ] T021 [US2] Add `setPrimary(id: number): Promise<void>` action to `frontend/src/state/store.tsx`: call `setPrimaryLocation`, on success call `load()` to refresh the list, on failure set `error` and leave the list unchanged.
- [ ] T022 [US2] Update `frontend/src/components/SidebarCard.tsx`: (a) render a visible, non-colour-only primary indicator (text badge, icon, or border accent) when `location.is_primary` is true — the indicator must not rely on colour alone for identification (FR-011); (b) render a Set as primary `<button>` on non-primary cards with `aria-label="Set [area] as primary"`, calling `setPrimary(location.id)` on click, with click propagation stopped; (c) hide the Set as primary button on the primary card (FR-010); (d) on action completion, ensure the change is announced to assistive technologies — acceptable approaches include an `aria-live` region in the sidebar or `aria-pressed` on the control; (e) show a visible inline error when `setPrimary` fails; also update `isFiltered` propagation from T015 to additionally hide the Set as primary control during search.

**Checkpoint**: The primary location is always at position 0 after every reload; the primary indicator is visible and non-colour-only; Set as primary is keyboard-operable; deleting the primary promotes the next location automatically; the invariant holds throughout.

---

## Phase 5: User Story 3 — Switch between locations by swiping on mobile (Priority: P1)

**Goal**: Mobile users can swipe horizontally across the main content area to cycle through the ordered location list; a visible Prev/Next control serves keyboard and pointer users on all viewports.

**Independent Test**: On a mobile-width viewport with locations [Primary, B, C] selected on Primary, swipe left — B is selected. Swipe left again — C is selected. Swipe left again — Primary is selected (wrap). Swipe right — C is selected (wrap). Scroll the page vertically — no location change.

### Implementation for User Story 3

- [ ] T023 [US3] Update `frontend/src/components/Hero.tsx` (or the outermost main-content wrapper that renders the selected location's detail): (a) add `touchstart` and `touchend` event handlers; classify a gesture as a location-switch only when `Math.abs(deltaX) > Math.abs(deltaY) * 2` AND `Math.abs(deltaX) > 40` — preventing vertical-scroll interference (FR-018); on qualifying left swipe call `select(nextId)`, on right swipe call `select(prevId)`, both wrapping at list boundaries (FR-017); no-op when `locations.length < 2` (FR-019); (b) add always-visible Previous location (`‹`) and Next location (`›`) `<button>` controls to the main content header area — these call the same `select(prevId)` / `select(nextId)` logic, wrap at boundaries, include `aria-label` naming the target location or direction, and are keyboard-focusable on all viewport widths (FR-020); (c) add `ChevronLeftIcon` and `ChevronRightIcon` SVG components to `frontend/src/components/icons.tsx` if not already present, matching the existing icon style.

**Checkpoint**: Mobile swipe selects adjacent locations and wraps; vertical scroll is unaffected; Prev/Next buttons operate identically via keyboard; single-location lists ignore swipe.

---

## Phase 6: Polish, validation, and regression protection

**Purpose**: Validate the full feature, confirm the test baseline, check scope, and produce the manual acceptance document.

- [ ] T024 [P] Create `specs/009-multi-location-management/manual-acceptance.md` covering: (a) reorder persists across reload; (b) primary designation persists; (c) delete-primary fallback; (d) first-add auto-primary; (e) mobile swipe all four edge cases (left advance, right retreat, left-wrap from last, right-wrap from first); (f) Prev/Next button keyboard operation; (g) screen-reader review of primary indicator, Move up/down labels, Set as primary announcement, and Prev/Next labels; (h) Move up/down hidden during search; (i) narrow viewport layout; (j) dashboard regression sweep (selection, add, refresh, delete, map, area picker, geolocation, hourly forecast, four-day forecast, wind display, location history).
- [ ] T025 [P] Run `npx vitest list --reporter=verbose`, `npm test`, `npm run build`, `npm run doctor` (with development server if required), and `git diff --check`; report the retained 18-test baseline count and total additive test count.
- [ ] T026 [P] Inspect the final diff for scope: only `backend/src/schema.ts`, `backend/drizzle/`, `backend/drizzle/meta/`, `backend/src/db.ts`, `backend/src/routes/locations.ts`, `backend/src/routes/locations.test.ts`, `frontend/src/types.ts`, `frontend/src/api.ts`, `frontend/src/state/store.tsx`, `frontend/src/components/SidebarCard.tsx`, `frontend/src/components/Sidebar.tsx`, `frontend/src/components/Hero.tsx`, `frontend/src/components/icons.tsx`, and `specs/009-multi-location-management/` may change; no other file may be modified; run `git diff --check` to confirm no trailing whitespace.
- [ ] T027 Run the full manual acceptance plan from `specs/009-multi-location-management/manual-acceptance.md`; all scenarios must pass before marking this task complete.

---

## Dependencies and execution order

```text
Phase 1 ──> Phase 2 ──> US1 (Phase 3) ──┐
                     ──> US2 (Phase 4) ──┤──> Phase 6
                     ──> US3 (Phase 5) ──┘
```

- Phase 2 blocks all user stories because it adds the schema columns and establishes the invariant that every subsequent operation depends on.
- US1, US2, and US3 can begin in parallel once Phase 2 is complete:
  - US1 and US2 both touch `backend/src/db.ts` and `backend/src/routes/locations.ts` — coordinate or serialize their edits to those files.
  - US1 and US2 both extend `frontend/src/components/SidebarCard.tsx` — coordinate or serialize those edits.
  - US3 (`frontend/src/components/Hero.tsx`) is fully independent of US1 and US2.
- Phase 6 requires all three user stories to be complete.

## Parallel opportunities

- T008 (frontend types) can start as soon as the intended schema is known — it does not depend on the migration running.
- T009 (US1 tests), T012 (US1 api.ts + icons), T016 (US2 primary tests), and T020 (US2 api.ts) are marked [P] and can run alongside other tasks in their phase that touch different files.
- T024 (manual-acceptance.md), T025 (validation commands), and T026 (diff inspection) can run in parallel with each other once all implementation tasks are done.
- T009 and T010 can proceed in parallel if T010 is developed against the planned interface before the route exists; both edit different files.
- T016 and T017 are NOT parallel: both add tests to `backend/src/routes/locations.test.ts` and must be serialised. T017 carries no [P] marker.

## Implementation strategy

### MVP first

1. Complete Phase 1 (baseline) and Phase 2 (schema + invariant).
2. Complete US1 (reorder) as the first visible user-facing capability.
3. Stop and validate US1 independently: three locations, reorder, reload, confirm persistence.
4. Add US2 (primary) to deliver persistent home-base placement.
5. Stop and validate US2 independently: set non-first as primary, reload, confirm first position.
6. Add US3 (swipe) to complete mobile navigation.
7. Run Phase 6 full validation.

### Incremental delivery

1. Schema + invariant layer: protects existing create/delete paths before any new UI exists.
2. Reorder controls: delivers visible sidebar ordering.
3. Primary designation: adds home-base pinning and the primary indicator.
4. Swipe + Prev/Next: completes mobile and accessible navigation.
5. Full validation and scope inspection: preserves all existing weather-starter features.
