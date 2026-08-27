# Manual acceptance plan: Location history and charts

## Entry and navigation

- Select a saved location on the dashboard and activate **View history**. Confirm the URL is `/locations/:id` for that location.
- Confirm the detail page has a clear, keyboard-operable **Back to dashboard** action and returns without changing saved locations or selection unexpectedly.
- Direct-load a valid `/locations/:id` in development mode and again from the compiled production host. Both must fetch the individual location, load the SPA detail page, synchronize the dashboard selection to that location, and leave `/api/*` requests handled by the API rather than the SPA fallback.
- Open an unknown id and an id deleted in another session. Both show a clear not-found state with a dashboard route.

## Data and chart semantics

- Create/refresh a location several times. Confirm the newest values remain on the dashboard and each successful refresh is represented in history, including identical observed timestamps/values.
- Confirm separate, visibly titled Temperature (°C), Rainfall (mm), and Humidity (%) time-series views.
- Confirm timestamps and values are available without hover or pointer use through the visible/screen-reader-accessible textual or tabular equivalent.
- Seed or simulate a reading with null metrics. Confirm it appears as unavailable/gapped—not as zero, an estimate, or a fabricated line segment.
- Confirm a location with no readings shows an explicit empty-history state.

## Limits and degradation

- With more than 240 seeded readings, confirm default loading selects the newest 240 and presents that selected window in chronological `recorded_at ASC, id ASC` order.
- Use a controlled local fixture or seeded test-database check with more than 1,000 readings; confirm the oldest records are pruned while the newest 1,000 remain. Do not use repeated live provider requests to validate retention.
- Use same-`recorded_at` seeded readings to confirm `id` is the deterministic tie-breaker for both newest-window selection and chronological display.
- Temporarily make the history request fail. Confirm a clear local failure message and retry action, while the dashboard shell/workflows stay usable.

## Responsive and accessibility checks

- At a narrow mobile viewport, confirm each chart, textual equivalent, and navigation action remains readable without clipped controls or unintended horizontal page overflow.
- Use only keyboard: enter history, navigate the detail content, inspect textual readings, and return to dashboard. Confirm focus order and visible focus remain clear.
- With a screen reader, verify page/title context, each metric/unit, unavailable values, and navigation controls are understandable without colour, animation, or chart hover.

## Dashboard regression sweep

- From the shared shell, verify location selection, refresh, deletion, Add Location’s area picker (including its bounded internal scrolling), Use my location, current conditions, hourly and four-day forecasts, wind display, and map selection still work.
