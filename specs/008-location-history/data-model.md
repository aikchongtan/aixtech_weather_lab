# Data model: Location history and charts

## Existing entity: `locations`

`locations` remains the authoritative latest snapshot for dashboard cards and the selected dashboard view. Its existing coordinates, forecast/current-condition fields, wind fields, and refresh metadata are unchanged by this feature.

## New entity: `weather_readings`

| Column | Type | Null | Purpose |
|---|---|---:|---|
| `id` | integer primary key | no | Stable tie-breaker for same-time records. |
| `location_id` | integer foreign key → `locations.id` | no | Owner of the reading; `ON DELETE CASCADE`. |
| `recorded_at` | text/ISO timestamp | no | Application time at successful persistence; ordering and retention basis. |
| `observed_at` | text/ISO timestamp | yes | Provider-observed time when available. |
| `temperature` | real | yes | Temperature in °C. |
| `rainfall` | real | yes | Rainfall in mm. |
| `humidity` | real | yes | Relative humidity in %. |

Only the user-facing historical metrics are stored. Do not add raw provider payloads, station IDs, wind data, condition text, forecasts, or provider error fields to this table.

## Relationship and lifecycle

```text
locations (1) ──< weather_readings (0..1000)
     │                     │
     └─ latest dashboard   └─ one row per successful persisted refresh
        snapshot
```

1. A successful weather result reaches the existing persistence boundary.
2. One SQLite transaction updates the latest `locations` snapshot, inserts one `weather_readings` row, and prunes only that location's rows beyond the newest 1,000.
3. A failed refresh performs none of these writes.
4. Deleting a location cascades to its readings when foreign-key enforcement is enabled.

## Retention and ordering

- Retain the newest 1,000 rows per location based on `recorded_at` with `id` as a deterministic tie-breaker.
- Never deduplicate successful refreshes.
- The read endpoint first chooses the newest requested rows (default 240, maximum 1,000), then returns that subset in oldest-to-newest order.
- Null metric values are valid historical observations and are returned as `null`; they are not filtered or converted.

## Migration requirements

Implementation requires one additive Drizzle migration that creates `weather_readings`, its location/ordering indexes, and the cascading foreign key. Connection initialization must enable `PRAGMA foreign_keys = ON`; SQLite does not guarantee this pragma by schema declaration alone.
