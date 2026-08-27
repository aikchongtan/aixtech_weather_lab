# Implementation Plan: Multi-location management

**Branch**: `module_9_multi_location_management` | **Date**: 2026-08-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/009-multi-location-management/spec.md`

## Summary

Feature 9 adds three user-visible capabilities to the existing Weather Starter dashboard: (1) Move up / Move down controls that let users reorder the sidebar location list and persist that order across sessions; (2) a Set as primary control that pins one location to position 0 on every application load; and (3) horizontal-swipe navigation in the main content area so mobile users can cycle through their ordered locations without tapping the collapsed sidebar. All existing add, refresh, delete, map, forecast, history, and weather workflows continue unchanged.

The implementation extends the `locations` table with two additive columns (`sort_order`, `is_primary`), adds two new API endpoints (reorder by direction, set primary), and introduces three frontend capabilities (reorder controls, primary controls, swipe navigation). No new frontend test framework is required. The backend invariant is: exactly one location carries `is_primary = 1` at all times when any locations are saved; zero when the table is empty.

## Technical Context

**Language/Version**: TypeScript (Node.js 20+ backend, React 18 frontend)

**Primary Dependencies**: Express, Drizzle ORM, SQLite (backend); React, Vite, Tailwind CSS, `react-router-dom`, `recharts` (frontend — no new packages required for this feature)

**Storage**: SQLite at `backend/weather.db` via Drizzle ORM; `db.transaction()` already in use for atomic multi-step writes

**Testing**: Vitest (`backend/src/**/*.test.ts`), 18 tests currently; no frontend test harness exists

**Target Platform**: Web browser SPA + single-process Node.js / Express server (development and production)

**Project Type**: Web application (frontend SPA + backend API)

**Performance Goals**: Standard interactive web responsiveness; reorder and primary-change operations are expected to complete in under one round-trip

**Constraints**:
- Migration must be additive; no existing columns may be altered or removed
- All 18 existing Vitest tests must remain green
- No new frontend test framework may be introduced
- The primary invariant must hold after every create, delete, reorder, and primary-change operation

**Scale/Scope**: Single-user personal weather tracker; typical location count is 1–10

## Constitution Check

The `.specify/memory/constitution.md` file contains only the unfilled project template — no project-specific principles or gates are in force. No violations to check.

## Project Structure

### Documentation (this feature)

```text
specs/009-multi-location-management/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── multi-location-management.openapi.yaml
└── tasks.md             # Phase 2 output ($speckit-tasks — not created by $speckit-plan)
```

### Source Code

```text
backend/
├── drizzle/                     # New additive migration (sort_order, is_primary)
├── drizzle/meta/                # Updated migration metadata
└── src/
    ├── schema.ts                # Two new columns on locations table
    ├── db.ts                    # New helpers: reorderLocation, setPrimaryLocation
    │                            # Updated: createLocation (first-add primary),
    │                            #           deleteLocation (primary fallback)
    └── routes/
        ├── locations.ts         # Two new endpoints; GET /api/locations updated
        └── locations.test.ts    # Additive tests for new endpoints and invariant

frontend/
└── src/
    ├── types.ts                 # Add is_primary: boolean to Location
    ├── api.ts                   # Add reorderLocation(), setPrimaryLocation()
    ├── state/
    │   └── store.tsx            # Add reorder(), setPrimary() actions
    └── components/
        ├── SidebarCard.tsx      # Add Move up, Move down, Set as primary controls
        ├── Hero.tsx             # Add Previous / Next location controls + swipe handler
        └── icons.tsx            # Add ChevronUp, ChevronDown, Star (or equivalent) icons
```

**Structure Decision**: Option 2 (web application). The repository already follows a `backend/` + `frontend/` split; all new files follow existing conventions within each subtree.

## Complexity Tracking

No constitution violations.
