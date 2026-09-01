# Feature Specification: Multi-location management

**Feature Branch**: `module_9_multi_location_management`
**Created**: 2026-08-27
**Status**: Draft
**Input**: User description: "Support reordering locations, setting a default/primary location, and swiping between locations on mobile. The primary location shows first on launch."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Reorder saved locations (Priority: P1)

As a user with multiple saved locations, I can move any location up or down in the sidebar list using visible controls, and my chosen order persists after the page is reloaded or the application is restarted.

**Why this priority**: Persistent user-controlled ordering is the foundation for meaningful primary-location placement and predictable swipe navigation; without a stable, user-defined sequence, both of those features have nothing reliable to operate on.

**Independent Test**: Add three or more locations, use Move up and Move down to create a custom order, reload the page, and confirm the same order is restored.

**Acceptance Scenarios**:

1. **Given** a list with more than one location, **When** the user activates Move up on any non-first location, **Then** that location moves one position higher and the new order persists after a page reload.
2. **Given** a list with more than one location, **When** the user activates Move down on any non-last location, **Then** that location moves one position lower and the new order persists after a page reload.
3. **Given** the location at the highest available position, **When** the user views its controls, **Then** Move up is absent or visibly disabled.
4. **Given** the location at the last position, **When** the user views its controls, **Then** Move down is absent or visibly disabled.
5. **Given** a search query is active in the sidebar, **When** the user views location controls, **Then** Move up and Move down are absent or disabled for all locations, preventing order changes against a filtered view.
6. **Given** a reorder action fails, **When** the error response is received, **Then** the list reverts to its previous order and a clear error message is shown.

---

### User Story 2 — Designate a primary location (Priority: P1)

As a user, I can mark exactly one saved location as my primary so that it always appears first in the list on every application load and is clearly distinguished from non-primary locations.

**Why this priority**: Reliable first-position placement of a user-chosen location is the headline value of this feature; the primary designation gives users a persistent "home base" that does not change between sessions.

**Independent Test**: Designate a non-first location as primary, reload the page, and confirm it appears first with a visible primary indicator while the previous primary appears in its previous sort position below.

**Acceptance Scenarios**:

1. **Given** a non-primary location, **When** the user sets it as primary, **Then** it moves to the first position in the list, the previous primary loses its designation, and this state persists after a page reload.
2. **Given** a primary designation exists, **When** the user sets a different location as primary, **Then** the new location becomes primary and appears first; the previous primary reverts to its sort position among the non-primary locations.
3. **Given** the primary location is deleted, **When** the deletion succeeds, **Then** the location that was immediately next in the pre-deletion order automatically becomes the new primary; if no locations remain, no primary exists.
4. **Given** no locations exist and the user adds the first one, **When** the add succeeds, **Then** that location automatically becomes the primary.
5. **Given** the primary location is displayed in the sidebar, **When** the user inspects its card, **Then** a visible, non-colour-only indicator distinguishes it from non-primary locations.
6. **Given** a user operates the Set as primary control using only a keyboard, **When** the action completes, **Then** the primary changes and the change is announced to assistive technologies.

---

### User Story 3 — Switch between locations by swiping on mobile (Priority: P1)

As a mobile user, I can swipe horizontally across the main content area to move to the next or previous location in my ordered list, without interfering with vertical page scrolling.

**Why this priority**: On a narrow viewport the sidebar is collapsed and selecting locations by tapping small list items is cumbersome; horizontal swipe is the expected touch pattern for navigating an ordered set of items.

**Independent Test**: On a mobile-width viewport with three locations, swipe left and confirm the next location is selected; swipe right and confirm the previous location is selected; scroll the page vertically and confirm no location change occurs.

**Acceptance Scenarios**:

1. **Given** two or more saved locations and a mobile-width viewport, **When** the user swipes left across the main content area, **Then** the next location in the ordered list is selected and displayed.
2. **Given** two or more saved locations and a mobile-width viewport, **When** the user swipes right across the main content area, **Then** the previous location in the ordered list is selected and displayed.
3. **Given** the last location in the list is selected, **When** the user swipes left, **Then** the first location (position 0, primary) is selected.
4. **Given** the first location (primary) is selected, **When** the user swipes right, **Then** the last location in the list is selected.
5. **Given** a vertical scroll gesture is initiated anywhere on the page, **When** the gesture includes incidental horizontal movement, **Then** the page scrolls normally and no location change occurs.
6. **Given** only one saved location exists, **When** the user swipes in either direction, **Then** no location change occurs.
7. **Given** the user cannot or does not use touch gestures, **When** the main content area is in focus, **Then** a visible and keyboard-accessible Previous location / Next location control is available to navigate the ordered list.

---

### Edge Cases

- No saved locations: no ordering controls, no primary designation, swipe is a no-op.
- Exactly one saved location: no Move up / Move down controls (nothing to reorder), that location is implicitly primary, swipe is a no-op.
- A new location is added to a non-empty list: it is appended at the end of the ordered list and does not become primary.
- The primary location is deleted and other locations remain: the location that was at position 1 before deletion automatically becomes the new primary, requiring no user action.
- The primary location is deleted and no locations remain: no primary exists; the next location added becomes primary automatically.
- A reorder action fails: the UI reverts to the pre-action order and displays a clear, inline error.
- A Set as primary action fails: the previous primary designation is retained and the error is displayed.
- During an active search or filter query: Move up, Move down, and Set as primary controls are absent or disabled to avoid ambiguity with filtered display order.
- On a non-mobile viewport: swipe gesture support is not required, but the accessible Previous / Next controls remain available.

## Requirements *(mandatory)*

### Functional Requirements

**Ordering**

- **FR-001**: The system MUST persist the display order of all saved locations so that the same sequence is presented after every page load and application restart.
- **FR-002**: Each saved location that is not at its highest available display position MUST expose a visible Move up control; the control MUST be absent or visibly disabled when the location cannot move higher.
- **FR-003**: Each saved location that is not at the last display position MUST expose a visible Move down control; the control MUST be absent or visibly disabled when the location cannot move lower.
- **FR-004**: Move up and Move down controls MUST be operable with a keyboard alone and their purpose MUST be communicated to assistive technologies.
- **FR-005**: When a search or filter query is active in the sidebar, Move up and Move down controls MUST be hidden or disabled for all locations.
- **FR-006**: When a reorder operation fails, the displayed order MUST revert to its state before the operation and a clear error message MUST be shown.

**Primary location**

- **FR-007**: Users MUST be able to designate exactly one saved location as the primary location; exactly one primary designation MUST exist at all times when at least one location is saved, and none when no locations are saved.
- **FR-008**: The primary location MUST always appear at the first position in the displayed list after every application launch and page load.
- **FR-009**: The primary designation MUST persist across browser refreshes and application restarts.
- **FR-010**: Each non-primary location MUST expose a visible Set as primary control; the primary location MUST NOT expose this control.
- **FR-011**: The primary location MUST carry a visible, non-colour-only indicator that distinguishes it from non-primary locations.
- **FR-012**: Set as primary MUST be operable with a keyboard alone and the resulting change MUST be announced to assistive technologies.
- **FR-013**: When the primary location is deleted, the location that was immediately next in the pre-deletion display order MUST automatically become the new primary. If no locations remain, no primary designation exists.
- **FR-014**: When the first location is added to a previously empty list, it MUST automatically become the primary location.
- **FR-015**: The primary location MUST NOT expose Move up or Move down controls; its display position is fixed at the top of the list.

**Mobile swipe navigation**

- **FR-016**: On a mobile-width viewport, the user MUST be able to select the next location in the ordered list by swiping left across the main content area, and the previous location by swiping right.
- **FR-017**: Swipe navigation MUST wrap: swiping left from the last location selects the first; swiping right from the first selects the last.
- **FR-018**: The horizontal swipe gesture MUST NOT suppress or interfere with vertical page scrolling.
- **FR-019**: Swipe navigation MUST have no effect when only one saved location exists.
- **FR-020**: The application MUST provide a visible, keyboard-accessible Previous location and Next location control that produces the same selection change as swipe navigation, available on all viewport widths.

**Regression protection**

- **FR-021**: All existing workflows — location selection, add, refresh, delete, map, area picker, geolocation, hourly forecast, four-day forecast, wind display, and location history — MUST retain their current behavior.
- **FR-022**: Existing automated tests MUST remain present and passing; feature coverage MUST be added without weakening or removing existing tests.

### Key Entities

- **Location order**: The persisted sequence in which a user's saved locations are displayed; independent of creation time and updated explicitly by the user.
- **Primary location**: The single saved location designated to appear first on every application load; exactly one primary exists when any locations are saved, and none when the list is empty.
- **Sort position**: The numeric index indicating where a saved location appears in the ordered list; the primary location's display position is always 0 regardless of its underlying sort index.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After the user reorders locations and reloads the page, the same sequence is displayed with no differences.
- **SC-002**: After the user designates a primary location and reloads the page, that location appears first in every subsequent session until the user changes the designation.
- **SC-003**: The primary designation can be changed using only a keyboard in no more than two actions from the target location card (focus Set as primary, activate).
- **SC-004**: On a mobile-width viewport with two or more saved locations, a predominantly horizontal swipe selects an adjacent location without causing visible vertical scroll displacement.
- **SC-005**: All reorder and primary controls are understandable and operable by a screen-reader user without relying on visual position, colour, or chart interaction.
- **SC-006**: All pre-existing automated tests continue to pass after the feature is implemented, with no reduction from the current 18-test inventory.

## Assumptions

- The primary location's underlying sort position is preserved when its primary status is transferred to another location, so that if the original primary is later re-designated it returns to a predictable position in the non-primary list.
- Move up and Move down apply to the persisted sort order of the full unfiltered list; the sidebar search/filter is a display concern only and does not alter persistent order.
- Move up and Move down controls are absent or disabled for the primary location because its display position is always 0; the first non-primary location's Move up control is likewise absent or disabled because it cannot advance past the pinned primary.
- Swipe direction convention: swipe left advances to the next location (higher index), swipe right retreats to the previous location (lower index), matching standard carousel conventions.
- Swipe gesture detection uses a predominantly horizontal intent threshold (horizontal displacement significantly exceeds vertical displacement) to distinguish intentional location switches from diagonal scroll gestures.
- Reorder and primary-change operations are applied immediately and persisted; optimistic UI updates that revert on failure are an acceptable pattern.
- The primary-location fallback on deletion (next location becomes primary) requires no user confirmation and produces no error state; it is a silent, deterministic transition that completes as part of the delete operation.
- The feature does not introduce per-user accounts or multi-device sync; all ordering and primary state is per-browser and backed by the existing server-side store.
