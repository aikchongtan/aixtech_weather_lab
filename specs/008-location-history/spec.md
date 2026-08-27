# Feature Specification: Location history and charts

**Feature Branch**: `008-location-history`
**Created**: 2026-08-24
**Status**: Draft
**Input**: User description: "Add a location detail page with charts while retaining every successful weather refresh as historical data."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Review a location's weather history (Priority: P1)

As a saved-location user, I can open a detail page from the selected dashboard location and review its recorded temperature, rainfall, and humidity over time.

**Why this priority**: The history view provides the feature's primary value: understanding how conditions at one saved location have changed.

**Independent Test**: Create or refresh one location several times, open its detail page, and confirm that each recorded refresh appears in the three time-series views and their accessible data equivalent.

**Acceptance Scenarios**:

1. **Given** a selected saved location with recorded readings, **When** the user chooses View history, **Then** the application opens that location's detail URL and shows temperature, rainfall, and humidity over time.
2. **Given** a history chart is visible, **When** the user cannot use a pointer or visual chart, **Then** the same reading values and timestamps are available in an accessible textual or tabular equivalent.
3. **Given** a reading has an unavailable metric, **When** the detail page displays that metric, **Then** it presents an unavailable gap rather than inventing a value.

---

### User Story 2 - Preserve refresh history (Priority: P1)

As a saved-location user, I can refresh weather and know that every successful persisted refresh is retained as a separate historical reading while the dashboard still shows the newest snapshot.

**Why this priority**: A detail page has no trustworthy data without a complete, ordered record of successful refreshes.

**Independent Test**: Complete multiple successful refreshes with repeated source timestamps and values, then confirm that the latest dashboard snapshot and every individual historical reading are retained.

**Acceptance Scenarios**:

1. **Given** an existing saved location, **When** a weather refresh succeeds, **Then** its latest dashboard snapshot is updated and one historical reading is retained together.
2. **Given** two successful refreshes contain identical provider timestamps or metric values, **When** both are persisted, **Then** both appear as distinct historical readings.
3. **Given** a successful refresh has one or more unavailable optional metrics, **When** it is retained, **Then** the reading retains those metrics as unavailable instead of being discarded.
4. **Given** a refresh fails before a current snapshot can be persisted, **When** the failure is reported, **Then** no historical reading is added and existing dashboard data remains intact.

---

### User Story 3 - Navigate safely to and from history (Priority: P2)

As a user, I can return from a location detail page to the dashboard and receive a clear outcome when a detail URL refers to an unknown or deleted location.

**Why this priority**: Direct links and deleted locations must not leave users stranded.

**Independent Test**: Open a valid detail URL, use its dashboard return action, and open an unknown/deleted location URL.

**Acceptance Scenarios**:

1. **Given** a valid location detail page, **When** the user chooses Back to dashboard, **Then** the dashboard opens without changing their saved locations.
2. **Given** an unknown or deleted location detail URL, **When** the page loads, **Then** it shows a clear not-found state and a route back to the dashboard.
3. **Given** the user is on the detail page, **When** existing dashboard workflows remain available in the shared application shell, **Then** selection, deletion, refresh, map, picker, forecasts, and wind display continue to work as before.

### Edge Cases

- A location has no successful persisted refreshes yet: show an explicit empty-history state.
- A location is deleted after a history link is saved: show not found rather than stale readings.
- A history request fails temporarily: show a clear retryable failure state without hiding the current dashboard workflow.
- More than the supported number of readings exist: return the newest supported set in chronological order.
- The saved location is refreshed repeatedly with the same provider timestamp or all optional metrics unavailable: retain each successful refresh as its own reading.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST retain a historical reading whenever a weather refresh successfully persists the latest snapshot for a saved location.
- **FR-002**: Each historical reading MUST retain the application-recorded time, the optional provider-observed time, temperature, rainfall, and humidity only.
- **FR-003**: The latest snapshot update, historical-reading creation, and historical-retention pruning MUST succeed or fail together.
- **FR-004**: The system MUST retain duplicate successful refreshes even when their provider timestamp or metric values match earlier readings.
- **FR-005**: The system MUST retain at most the newest 1,000 readings for each saved location.
- **FR-006**: The system MUST remove a location's historical readings when that location is deleted.
- **FR-007**: The system MUST provide a narrow per-location history response containing no raw provider payloads or provider error details.
- **FR-008**: A history request MUST return at most 1,000 readings, default to 240 readings when no limit is requested, and order returned readings from oldest to newest.
- **FR-009**: Users MUST be able to enter the detail page for the selected dashboard location at `/locations/:id` through a View history action.
- **FR-010**: The detail page MUST display separate time-series views for temperature, rainfall, and humidity with explicit units and accessible text or table equivalents.
- **FR-011**: The detail page MUST display unavailable metric values as gaps or unavailable values, never as substituted zeroes or estimates.
- **FR-012**: Unknown or deleted location detail URLs MUST show a clear not-found state with an available route back to the dashboard.
- **FR-013**: Existing dashboard, refresh, map, deletion, area-picker, geolocation, hourly forecast, four-day forecast, and wind workflows MUST retain their current behavior.
- **FR-014**: Existing automated tests MUST remain present and passing; feature coverage MUST be added without weakening or replacing existing tests.

### Key Entities

- **Saved location**: A user-tracked Singapore location with a current weather snapshot and an ordered history of recorded readings.
- **Historical reading**: One successful persisted refresh for one saved location, containing recorded time, optional observed time, and the three charted metric values.
- **History response**: A bounded oldest-to-newest collection of historical readings for one saved location.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After each successful refresh, the dashboard's current snapshot and one corresponding historical reading are both available; after a failed refresh, neither changes.
- **SC-002**: A user can open a selected location's history, identify all three requested metrics, and return to the dashboard in no more than two direct actions from the dashboard.
- **SC-003**: A history response returns no more than 1,000 chronological readings and defaults to no more than 240 when no limit is supplied.
- **SC-004**: Users can obtain every charted value and timestamp without relying on colour, hover, animation, or pointer interaction.
- **SC-005**: Existing automated coverage remains intact, with no reduction from the current 12-test inventory.

## Assumptions

- Every successful persisted refresh is a meaningful application observation, even when the source timestamp or optional metric values repeat.
- The application-recorded refresh time is the ordering key; an optional provider-observed time is retained for context.
- The history view is limited to temperature, rainfall, and humidity; wind, forecasts, and other current-only values remain available on the dashboard.
- Detail-page chart data remains private to the application and does not expose source payloads, station identifiers, or provider errors.
- The shared application shell continues to provide the existing location-management workflows while the detail page is open.
