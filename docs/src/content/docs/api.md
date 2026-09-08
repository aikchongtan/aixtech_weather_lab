---
title: API
description: HTTP endpoints served by the Weather Starter backend.
---

All application endpoints use the same origin as the frontend. In local development, use the Portless URL printed by `npm run dev`.

## Health and logging

| Method | Path | Behavior |
| --- | --- | --- |
| `GET` | `/health` | Returns `{ "status": "healthy" }`. |
| `POST` | `/api/logs` | Accepts a frontend interaction event and returns `204`. |

`/api/logs` expects an event name matching lowercase letters followed by lowercase letters, digits, `.`, `_`, `:`, or `-`.

## Locations

| Method | Path | Behavior |
| --- | --- | --- |
| `GET` | `/api/locations` | Lists locations, primary first and then by saved order. |
| `POST` | `/api/locations` | Creates a Singapore location and attempts an initial refresh. |
| `GET` | `/api/locations/:locationId` | Returns one saved location. |
| `DELETE` | `/api/locations/:locationId` | Deletes a location and returns `204`. |
| `POST` | `/api/locations/:locationId/refresh` | Fetches and persists a fresh weather snapshot. |
| `PATCH` | `/api/locations/:locationId/order` | Moves a non-primary location up or down. |
| `POST` | `/api/locations/:locationId/primary` | Marks a location as primary. |
| `GET` | `/api/locations/:locationId/history` | Returns readings, oldest first. |
| `GET` | `/api/forecast-areas` | Lists selectable forecast areas from the provider. |

### Create a location

```http
POST /api/locations
Content-Type: application/json

{
  "latitude": 1.35,
  "longitude": 103.85
}
```

Coordinates must be within the application's Singapore bounds: latitude `1.1–1.5` and longitude `103.6–104.1`. Duplicate coordinates return `409`; invalid coordinates return `422`.

### Location history

`GET /api/locations/:locationId/history` accepts an optional `limit` query parameter. It defaults to `240`, must be a positive integer, and is capped at `1000`.

The response contains the location ID and readings with `recorded_at`, `observed_at`, `temperature_c`, `rainfall_mm`, and `humidity_percent`.

### Ordering

Send `{ "direction": "up" }` or `{ "direction": "down" }` to the ordering endpoint. The primary location cannot be reordered; boundary and primary-ordering conflicts return `409`.
