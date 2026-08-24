# Test strategy: Location history and charts

## Protected baseline

The existing inventory is a hard regression gate: **12 tests must remain present and passing**—five location-route tests in `backend/src/routes/locations.test.ts` and seven weather-client tests in `backend/src/weather.test.ts`. Do not rename, merge, weaken, skip, or replace them. Use `npx vitest list --reporter=verbose` before and after implementation to verify the inventory.

## Backend additions

Add focused tests alongside the current backend tests for:

1. **Atomic successful refresh**: a successful create/refresh updates the current snapshot and creates exactly one matching history row.
2. **Failed refresh**: a provider failure changes neither the latest snapshot nor history count.
3. **Duplicates and nulls**: repeated observed timestamps/metric values create separate rows; null temperature, rainfall, and humidity values are retained.
4. **Retention**: after more than 1,000 successful writes for one location, only its newest 1,000 rows remain; another location is unaffected.
5. **History contract**: the endpoint defaults to 240, caps an oversized positive request at 1,000, emits no raw provider data, and returns the selected newest subset oldest-first.
6. **Errors**: malformed/non-positive location ids or limits receive the documented client error; unknown locations receive 404; a deleted location’s history cannot be read.
7. **Cascade**: deleting a location removes its history rows with foreign keys enabled.
8. **Transaction rollback**: force a write failure in the persistence unit and assert no partial latest-snapshot/history/prune state becomes visible.

Use deterministic fixture timestamps and direct database setup where needed; avoid network access and real provider payloads.

## Frontend additions

If the existing frontend test setup supports component tests, add focused coverage for:

- “View history” routes the currently selected location to `/locations/:id`.
- The detail page renders all three labelled metrics with their units and accessible reading-equivalent content.
- Null values are exposed as unavailable and charted as gaps, not zero.
- Loading, empty, retryable error, and not-found states have a usable dashboard return route.

If no frontend component-test harness exists, do not introduce a broad new test framework solely for this task; cover these items in the manual plan and keep the backend contract thoroughly tested.

## Required validation commands

After implementation, run:

```text
npx vitest list --reporter=verbose
npm test
npm run build
npm run doctor
git diff --check
```

The verbose list must show the original 12 tests plus only additive coverage. The doctor command may require the development server, following the README’s Portless guidance.
