# Manual acceptance: Multi-location management

## Prerequisites

- Run the Weather Starter application using its normal development workflow.
- Use a browser with desktop responsive tools available and, where possible, a screen reader.
- Start with no saved locations, or delete existing locations before each scenario that requires a clean list.
- Use three distinct Singapore locations referred to below as A, B, and C. Record each displayed area name.

## Reorder saved locations

| Step | Expected result | Pass/Fail |
| --- | --- | --- |
| 1. Add A, then B, then C. | A is first and primary; B and C follow in creation order. | |
| 2. Move C up once. | The list is A, C, B. | |
| 3. Reload the browser. | The list remains A, C, B. | |
| 4. Try Move up on the first non-primary location. | The control is disabled or unavailable; the order does not change. | |
| 5. Try Move down on the last location. | The control is disabled or unavailable; the order does not change. | |
| 6. Inspect A. | Primary A has no Move up or Move down controls. | |

## Primary location and fallback

| Step | Expected result | Pass/Fail |
| --- | --- | --- |
| 1. With A, B, C saved, set C as primary. | C is first, has the visible Primary badge, and A/B retain their relative order. | |
| 2. Reload the browser. | C remains first and primary. | |
| 3. Delete C. | The location immediately next in the prior display order becomes primary and is first. | |
| 4. Delete all locations, then add one location. | The first added location is automatically primary. | |

## Mobile swipe navigation

| Step | Expected result | Pass/Fail |
| --- | --- | --- |
| 1. At a mobile-width viewport, save A, B, C and select A. Swipe left across non-interactive main content. | B is selected. | |
| 2. Swipe left again. | C is selected. | |
| 3. Swipe left from C. | Selection wraps to A. | |
| 4. Swipe right from A. | Selection wraps to C. | |
| 5. Perform a mostly vertical swipe or normal vertical scroll. | The page scrolls normally and selection does not change. | |
| 6. With only one saved location, swipe in either direction. | Selection does not change. | |

## Keyboard navigation and assistive technology

| Step | Expected result | Pass/Fail |
| --- | --- | --- |
| 1. On desktop, Tab to Previous location and Next location in the main-content header. | Both controls are visible and keyboard-focusable. | |
| 2. Activate Next and Previous with Enter or Space, including at both ends of the list. | Selection follows the ordered list and wraps at both ends. | |
| 3. With a screen reader, inspect the primary card. | The text Primary badge is announced; identification does not rely on colour. | |
| 4. Inspect Move controls on a non-primary card. | Their labels include the area name and direction, for example “Move Tampines up.” | |
| 5. Set a non-primary location as primary. | The primary-change success is announced. | |
| 6. Inspect Previous and Next controls. | Their labels identify the target area or navigation direction. | |

## Search and responsive sidebar

| Step | Expected result | Pass/Fail |
| --- | --- | --- |
| 1. Enter a non-empty sidebar search query. | Move up, Move down, and Set primary controls are hidden or disabled for every visible card. | |
| 2. While search is active, use Delete on a visible card. | Delete remains available and works. | |
| 3. Clear the search query. | Reorder and Set primary controls return according to each card’s state. | |
| 4. At the normal desktop sidebar width, inspect cards such as Tampines and Tuas. | Singapore-area names are fully readable without truncation. | |
| 5. At a narrow mobile-width viewport, inspect cards with all available actions. | The card remains usable; actions can reflow without overlap or clipping. | |

## Dashboard regression sweep

| Step | Expected result | Pass/Fail |
| --- | --- | --- |
| 1. Select each saved location from the sidebar. | The main dashboard updates to the selected location. | |
| 2. Add a location using the area picker, then add one using geolocation if supported. | Both workflows complete or show their existing clear failure states; the saved list updates. | |
| 3. Refresh a selected location. | Weather data refreshes and the normal refresh state completes. | |
| 4. Delete a non-primary location. | It is removed; remaining selection and ordering stay usable. | |
| 5. Inspect the map. | The map renders and remains interactive. | |
| 6. Inspect hourly and four-day forecast displays. | Both displays render their expected data or existing empty states. | |
| 7. Inspect wind information. | Wind speed and direction remain available when supplied by the provider. | |
| 8. Open location history from the dashboard. | History opens for the selected location and its normal navigation still works. | |

## Acceptance outcome

Pass the feature only when every applicable row is marked Pass. Record any unavailable device, browser, geolocation, or screen-reader capability as Not run with the reason.
