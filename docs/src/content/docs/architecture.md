---
title: Architecture
description: How the browser, application server, weather provider, and database work together.
---

## Runtime topology

The backend is a Node.js and Express application. In development it mounts Vite middleware, so the browser uses one origin for both the dashboard and its API calls. The React client requests relative `/api` paths and does not need a separately configured backend URL.

```mermaid
flowchart TB
    Browser[React client in browser]
    Portless[Portless local proxy]
    Express[Express application]
    Vite[Vite middleware]
    Routes[Locations router]
    Weather[SingaporeWeatherClient]
    SQLite[(weather.db)]
    DataGov[data.gov.sg APIs]

    Browser --> Portless --> Express
    Express --> Vite
    Express --> Routes
    Routes --> Weather --> DataGov
    Routes --> SQLite
```

## Location refresh flow

The application uses a snapshot pattern: normal location reads come from SQLite rather than calling the weather provider on every page load.

```mermaid
sequenceDiagram
    participant UI as React UI
    participant API as Express API
    participant DB as SQLite
    participant Provider as data.gov.sg

    UI->>API: POST /api/locations/:id/refresh
    API->>DB: Read saved coordinates
    API->>Provider: Fetch forecast and nearest readings
    Provider-->>API: Weather payloads
    API->>DB: Update latest snapshot and append reading history
    API-->>UI: Updated location
```

When a new location is created, the server first saves it with a placeholder snapshot, then attempts the same refresh flow. If the provider is unavailable, creation still succeeds and the location remains available for a later refresh.

## Frontend state

`StoreProvider` loads locations on mount and owns the selected location, loading state, refresh state, and API errors. The dashboard route renders the layout; `/locations/:id` renders the location-history view. UI interactions call the API client, then reload the location list to synchronize the React state with persisted order and primary-location changes.

## Observability

The Express app exposes `GET /health` and uses Pino HTTP logging. The React API client also sends interaction events to `POST /api/logs`; the server validates the event name and logs it without persisting it.
