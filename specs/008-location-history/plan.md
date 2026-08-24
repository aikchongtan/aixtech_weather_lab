# Implementation Plan: Location history and charts

**Branch**: `008-location-history` | **Date**: 2026-08-24 | **Spec**: [spec.md](./spec.md)

## Summary

Persist one bounded, immutable history reading whenever a latest weather snapshot is successfully saved. Add a narrow, chronological per-location history API, then introduce a routed location-detail page with accessible temperature, rainfall, and humidity charts. The existing dashboard remains the current-conditions surface and continues to own all established location-management workflows.

## Technical Context

**Language/Version**: TypeScript; Node/Express backend and React 18/Vite frontend.
**Primary Dependencies**: Existing Drizzle ORM, SQLite (`node:sqlite`), Vitest, and Supertest. Approved for implementation: `react-router-dom` and `recharts`; neither is installed in this planning change.
**Storage**: SQLite with Drizzle schema and a generated migration to be created during implementation.
**Testing**: Existing Vitest backend suite (12 tests: 5 route, 7 weather-client) must remain unchanged and passing; add focused database/route coverage and frontend tests where the existing tooling supports them.
**Target Platform**: Responsive browser dashboard, including narrow mobile viewports and keyboard/screen-reader use.
**Project Type**: Full-stack web application (`backend/` and `frontend/`).
**Performance Goals**: Default history response is at most 240 readings; responses never exceed 1,000. Charts must remain responsive with the maximum retained data set.
**Constraints**: One SQLite transaction for latest snapshot update, history insert, and retention prune; use `recorded_at, id` as the deterministic ordering pair; retain every successful refresh (including repeated provider timestamps and null optional metrics); provider payloads/errors remain private; no regression to dashboard workflows.
**Scale/Scope**: One history table, one read endpoint, one routed detail page, three metric charts, and shared navigation only.

## Constitution Check

The repository constitution is an unratified placeholder with no enforceable project principles. The approved feature specification is therefore the governing gate. This plan passes it by preserving existing contracts and workflows, retaining the 12-test baseline, keeping raw provider data private, and limiting the new persisted record to the five approved history fields.

The gate is re-checked after design: no additional application boundary, external provider exposure, dependency beyond the two approved frontend libraries, or migration outside the required history schema is proposed.

## Project Structure

### Documentation (this feature)

```text
specs/008-location-history/
├── plan.md
├── research.md
├── data-model.md
├── test-strategy.md
├── manual-acceptance.md
├── quickstart.md
└── contracts/
    └── location-history.openapi.yaml
```

### Source Code (implementation scope)

```text
backend/
├── drizzle/                         # generated history migration (later)
└── src/
    ├── db.ts                        # atomic snapshot/history persistence and reads
    ├── schema.ts                    # history table and cascade relationship
    └── routes/locations.ts          # history endpoint

frontend/src/
├── App.tsx                          # router boundary
├── api.ts                           # narrow history client helper
├── types.ts                         # history DTO types
├── state/store.tsx                  # reuse current selected-location state
├── components/
│   └── Hero.tsx                     # View history entry point
└── pages/ or components/            # location detail page and chart components

backend/src/routes/locations.test.ts # retain 5 tests; add route/history assertions
backend/src/weather.test.ts          # retain 7 tests unchanged
frontend/src/**/*.test.tsx           # add only if project test setup supports it
```

**Structure Decision**: Keep the existing backend route/database boundaries and frontend component/store/API layers. Add the detail page in the frontend’s existing source tree rather than creating a second application or an independent selected-location store.

## Implementation Sequence

1. Add the `weather_readings` Drizzle table and migration, including a cascading `location_id` foreign key. Enable SQLite foreign-key enforcement at connection initialization.
2. Refactor only the snapshot persistence boundary so a successful weather result updates the latest snapshot, inserts one history row, and prunes older rows in one transaction. Retention keeps rows ordered by `recorded_at DESC, id DESC`; do not add a row for failed refreshes.
3. Add `GET /api/locations/:locationId/history` using the contract in `contracts/location-history.openapi.yaml`; validate identifiers and limits, return invalid limits as HTTP 400 with `{ "detail": "…" }`, cap valid oversized limits at 1,000, select the newest window by `recorded_at DESC, id DESC`, then return that window by `recorded_at ASC, id ASC`.
4. Add API and route tests before or alongside the backend work, preserving every current route and weather-client test.
5. Add the approved frontend packages during implementation, introduce `BrowserRouter`, and add the selected-dashboard “View history” link. On a direct `/locations/:id` load for an existing location, synchronize the existing store with `select(location.id)` rather than creating local selected-location state. Verify development and compiled-production hosting serve the SPA route; if either does not, add only the smallest fallback that serves the frontend shell for non-`/api/*` requests and never intercepts API routes.
6. Build the detail route with loading, retry, empty, and not-found states. Render three separately labelled charts and an accessible text/table equivalent for every reading; represent null metrics as unavailable gaps.
7. Run the automated and manual checks in [test-strategy.md](./test-strategy.md) and [manual-acceptance.md](./manual-acceptance.md), including all dashboard regressions.

## Test Strategy

The complete strategy is in [test-strategy.md](./test-strategy.md). The implementation gate is: retain the exact existing 12-test inventory, add coverage for atomic history writes, retention, chronological bounded reads, deletion cascade, invalid/unknown history requests, and detail-page states. A passing suite is insufficient if any existing test is removed, merged, weakened, or made undiscoverable.

## Complexity Tracking

No constitution exception is required. The history table and route are the smallest changes that satisfy durable, per-location history without exposing provider payloads or moving weather fetches into the browser.
