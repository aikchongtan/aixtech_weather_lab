# Implementation and validation quickstart

This is a handoff checklist for the approved Feature 9 implementation. It is not an implementation action and does not install packages, run migrations, or alter source files.

## Before starting

1. Read [spec.md](./spec.md), [plan.md](./plan.md), [research.md](./research.md), [data-model.md](./data-model.md), and the [API contract](./contracts/multi-location-management.openapi.yaml).
2. Run `npx vitest list --reporter=verbose` and record the 18-test baseline before making any changes.
3. Confirm `git diff --check` is clean and the working tree matches the branch.

## Implementation order

Work in this sequence to keep the feature incrementally testable:

1. **Backend schema and migration** — add `sort_order` and `is_primary` to `locations`; backfill existing rows; verify `npm run db:migrate` succeeds with no data loss.
2. **Backend helpers** — extend `db.ts` with `reorderLocation(id, direction)` and `setPrimaryLocation(id)`, update `createLocation` (first-add primary) and `deleteLocation` (primary fallback). All invariant transitions happen inside `db.transaction()`.
3. **Backend routes** — add `PATCH /api/locations/:id/order` and `POST /api/locations/:id/primary`; update `GET /api/locations` ordering to `is_primary DESC, sort_order ASC`; add `is_primary` to Location responses.
4. **Backend tests** — add additive tests for: reorder up/down success and boundary 409, set primary success and idempotent repeat, delete-primary fallback, first-add primary, invariant across create+delete sequences. Run `npm test` and confirm all 18 original tests still pass alongside the new ones.
5. **Frontend types and API client** — add `is_primary: boolean` to `Location` type; add `reorderLocation(id, direction)` and `setPrimaryLocation(id)` to `api.ts`.
6. **Frontend store** — add `reorder(id, direction)` and `setPrimary(id)` actions to `store.tsx`; both reload the location list on success and surface errors on failure.
7. **Sidebar controls** — add Move up, Move down, and Set as primary buttons to `SidebarCard`; hide Move up / Move down on the primary; disable Move up on the first non-primary; disable Move down on the last; hide all three controls when a search query is active in `Sidebar`.
8. **Main content navigation** — add Previous / Next location icon buttons to the main content header area (always visible, keyboard-focusable, call `select()`); add touch swipe handler on the main content element (2:1 ratio, 40 px threshold; wraps at boundaries).

## Validation scenarios

Run each scenario after completing the corresponding implementation step.

### Ordering and primary (backend + sidebar)

| Scenario | Steps | Expected outcome |
|---|---|---|
| Reorder persists | Add 3+ locations → Move down on first → reload | Second location is now first |
| Boundary enforcement | Move up on first non-primary | Button absent or disabled; PATCH returns 409 if called directly |
| Primary pinned | Set middle location as primary → reload | Primary at index 0; others in sort order below it |
| Primary change | Set primary → set a different primary → reload | New primary at index 0; first primary is now in its previous non-primary sort position |
| Delete non-primary | Delete a non-primary location | Primary unchanged; list collapses in sort order |
| Delete primary, others remain | Delete primary | Former second location is now primary automatically |
| Delete primary, no others | Delete only location | No primary; empty-list state |
| First-add primary | Reset DB → add first location | That location has is_primary: true |
| Second-add not primary | Add second location | Second location has is_primary: false |
| Search hides controls | Type in sidebar search box | Move up, Move down, Set as primary absent or disabled |
| Error reverts order | Simulate network failure on PATCH | List stays in its previous order; error message shown |

### Mobile swipe (main content)

| Scenario | Steps | Expected outcome |
|---|---|---|
| Swipe left advances | Mobile viewport, 2+ locations, swipe left | Next location selected |
| Swipe right retreats | Mobile viewport, 2+ locations, swipe right | Previous location selected |
| Wrap from last | Select last location, swipe left | First location (primary) selected |
| Wrap from first | Select primary, swipe right | Last location selected |
| Vertical scroll unaffected | Scroll page vertically with slight horizontal lean | Page scrolls; no location change |
| Single location no-op | 1 location, swipe in either direction | No change |
| Previous / Next buttons | Keyboard-focus Next button, press Enter | Next location selected |

### Dashboard regression

Confirm all of the following still work after Feature 9 is implemented:

- Location selection (sidebar card click and keyboard Enter / Space)
- Add location (area picker, geolocation)
- Refresh weather
- Delete location (non-primary and primary)
- Map pin display and map-based selection
- Hourly and four-day forecast panels
- Wind display
- Location history page (`/locations/:id`) and back navigation

## Validation commands

```bash
npm test                # All original 18 tests + new additive tests must pass
npm run build           # TypeScript must compile cleanly
npm run doctor          # /health and /api/locations must respond correctly
git diff --check        # No trailing whitespace or merge markers
```
