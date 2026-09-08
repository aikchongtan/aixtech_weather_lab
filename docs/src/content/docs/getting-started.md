---
title: Getting started
description: Run Weather Starter locally and work with its development commands.
---

## Requirements

- Node.js and npm
- A current browser

## Install and run

From the repository root:

```sh
npm install
npm run dev
```

Portless starts the application on a stable local URL. The usual address is:

```text
http://weather-starter.localhost:1355
```

The development process runs Express and Vite together. Express handles `/api/*`; Vite serves the React application and its hot-reload assets.

## Environment

The data.gov.sg endpoints work without an API key for normal local usage. Set `WEATHER_API_KEY` if a key is available:

```sh
export WEATHER_API_KEY=your_api_key_here
npm run dev
```

`DATABASE_PATH` can override the default SQLite location, `backend/weather.db`.

## Common commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run the local app through Portless. |
| `npm run build` | Build the frontend and compile the backend. |
| `npm run start` | Run the compiled production server. |
| `npm test` | Run backend API tests. |
| `npm run doctor` | Check `/health` and `/api/locations`. |
| `npm run reset` | Remove the local SQLite database. |
| `npm run db:generate` | Generate a Drizzle migration after schema changes. |
| `npm run db:migrate` | Apply migrations to the local database. |
| `npm run docs` | Run this documentation site. |
