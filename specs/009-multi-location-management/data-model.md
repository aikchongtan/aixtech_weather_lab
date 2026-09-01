# Data model: Multi-location management

## Modified entity: `locations`

Two additive columns are added to the existing `locations` table. No existing columns are altered or removed.

| Column | Type | Null | Default | Purpose |
|---|---|:---:|---|---|
| `sort_order` | integer | no | see below | Determines display position among non-primary locations. Lower value = earlier in list. |
| `is_primary` | integer | no | `0` | `1` for the designated primary location, `0` for all others. Exactly one row is `1` when any locations exist; zero rows are `1` when the table is empty. |

### sort_order semantics

- On insert: `sort_order = SELECT COALESCE(MAX(sort_order), 0) + 1 FROM locations` (appends to the end of the current list).
- On reorder (swap): the `sort_order` values of two non-primary locations are exchanged atomically in one transaction.
- The primary location's `sort_order` is preserved through primary changes; it is never involved in up/down swaps while `is_primary = 1`.
- `sort_order` values are not guaranteed to be contiguous; only their relative order matters.

### is_primary invariant

| State | is_primary count |
|---|---|
| Table is empty | 0 rows with `is_primary = 1` |
| One or more locations exist | Exactly 1 row with `is_primary = 1` |

Invariant transitions are always performed atomically inside `db.transaction()`:

| Operation | Invariant action |
|---|---|
| Insert into empty table | Set new row `is_primary = 1`. |
| Insert into non-empty table | Set new row `is_primary = 0`. |
| Set primary (target is not current primary) | UPDATE all rows `is_primary = 0`, then UPDATE target `is_primary = 1`. |
| Set primary (target is already primary) | No-op; returns 200. |
| Delete non-primary location | No is_primary change needed. |
| Delete primary location, other rows remain | Within the delete transaction, UPDATE the remaining location with the lowest `sort_order` to `is_primary = 1`. |
| Delete primary location, table becomes empty | No is_primary change needed (table is empty; invariant satisfied). |

### GET /api/locations ordering

Locations are returned ordered by `is_primary DESC, sort_order ASC`. This places the primary location at index 0 and all non-primary locations in their user-defined sort order below it. No application-layer sorting is required.

## Migration requirements

One additive Drizzle migration:

1. `ALTER TABLE locations ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0`
2. `ALTER TABLE locations ADD COLUMN is_primary INTEGER NOT NULL DEFAULT 0`
3. Backfill `sort_order` to each row's `id` value (preserves existing creation order).
4. Set `is_primary = 1` for the row with the lowest `id` (matches the current `isHome = locations[0].id` convention).
5. Add a unique index on `sort_order` within the non-primary subset — **or** accept non-unique values and rely on `(is_primary DESC, sort_order ASC, id ASC)` for deterministic ordering. The simpler approach (no unique constraint) is preferred; the swap operation keeps values distinct for non-primary rows by design.

`PRAGMA foreign_keys = ON` is already set in `db.ts` from Feature 8; no change required.

## Updated API response shape

The `Location` type returned by all `/api/locations` endpoints gains one new field:

```json
{
  "id": 1,
  "latitude": 1.3,
  "longitude": 103.8,
  "created_at": "2026-08-01T10:00:00.000Z",
  "is_primary": true,
  "weather": { "..." : "..." }
}
```

`sort_order` is an internal ordering key and is **not** exposed in API responses. The frontend infers reorder eligibility from array position in the ordered response.

## No new entity or relationship

Feature 9 does not introduce a new table. The change is entirely within the `locations` table.
