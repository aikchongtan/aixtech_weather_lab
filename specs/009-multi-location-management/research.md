# Research: Multi-location management

## SQLite sort_order and primary invariant

**Decision**: Add `sort_order INTEGER NOT NULL` and `is_primary INTEGER NOT NULL DEFAULT 0` to the `locations` table. Enforce exactly-one-primary in the application layer (inside `db.transaction()` blocks), not via a SQLite constraint, because SQLite does not support deferred constraint checking that would allow transitional states during a transaction.

**Rationale**: The application already uses `db.transaction()` for atomic multi-step writes (Feature 8 history + snapshot + prune). The same pattern applies here: setting a new primary atomically clears the old one and sets the new one in one transaction. Enforcing in the app layer is consistent with how foreign-key cascade is handled (`PRAGMA foreign_keys = ON` set in `db.ts`).

**Alternatives considered**:
- CHECK constraint `(SELECT COUNT(*) FROM locations WHERE is_primary = 1) <= 1` — SQLite supports this syntax but evaluates it per-row, not deferred, which would fail a transaction that clears then sets primary in two steps.
- A separate `primary_location` table with a single row — more normalized but adds complexity with no benefit at this scale.

---

## Initial sort_order on existing data (migration backfill)

**Decision**: The additive migration sets `sort_order` to `rowid` (equivalent to `id`) for all existing rows and sets `is_primary = 1` for the row with the lowest `id`. New inserts compute `sort_order = MAX(sort_order) + 1` at insert time.

**Rationale**: Using `id` as the initial sort_order preserves creation order for existing users. Setting the oldest location as primary matches the current `isHome = locations[0].id` behaviour in `SidebarCard.tsx`, providing a smooth upgrade path.

**Alternatives considered**:
- Using `created_at` as initial sort — functionally equivalent since `id` is auto-increment and creation order is preserved; `id` is simpler.
- Requiring users to designate their primary after migration — worse UX, violates FR-014 intent (first location is automatic primary).

---

## Direction-only reorder endpoint

**Decision**: `PATCH /api/locations/:id/order` accepts `{ "direction": "up" | "down" }`. The backend atomically swaps the `sort_order` of the target location with its adjacent non-primary neighbour in the ordered list. Returns the full updated location list.

**Rationale**: The frontend only needs two controls (Move up / Move down), so an absolute-index endpoint is unnecessary complexity. The direction-only contract is simpler to validate and matches the spec's agreed interface.

**Swap logic**:
1. Fetch all non-primary locations ordered by `sort_order ASC` into an array.
2. Find the target's array index.
3. For "up": if index = 0, return 409; else swap `sort_order` with the element at index − 1 in one transaction.
4. For "down": if index = last, return 409; else swap `sort_order` with the element at index + 1 in one transaction.
5. The primary location's `sort_order` is never involved in these swaps.
6. Return the updated list (primary first, then non-primaries by `sort_order ASC`).

**Alternatives considered**:
- Absolute position endpoint `{ "sort_order": N }` — more powerful but unnecessary; all user interactions are single-step moves.
- Returning only the two affected locations — requires the frontend to merge state, which is error-prone; returning the full list is simpler and consistent with how `GET /api/locations` works.

---

## Primary-location endpoint

**Decision**: `POST /api/locations/:id/primary` sets the target as primary in a single transaction (UPDATE all rows `is_primary = 0`, then UPDATE target `is_primary = 1`). Idempotent: if the target is already primary, the same transaction runs with no observable side effect. Returns the full updated list.

**Rationale**: An idempotent endpoint avoids race conditions if the user double-clicks. The two-step UPDATE is safe inside a transaction because both steps are visible only after commit.

---

## Primary fallback on delete

**Decision**: Extend the existing `deleteLocation` helper. Inside the same transaction that deletes the row: if the deleted location had `is_primary = 1` AND `COUNT(remaining) > 0`, immediately UPDATE the remaining location with the lowest `sort_order` to `is_primary = 1`.

**Rationale**: Selecting the location with the lowest `sort_order` among remaining locations is deterministic and matches FR-013 ("immediately next in the display order"). Because non-primary locations have increasing `sort_order` values and are displayed in that order, the lowest remaining `sort_order` is the location that was at position 1 before deletion.

---

## GET /api/locations ordering

**Decision**: `GET /api/locations` returns locations ordered `is_primary DESC, sort_order ASC`. This puts the primary first (is_primary = 1 sorts before 0) and non-primaries in sort_order order.

**Rationale**: Single ORDER BY clause, no application-layer sorting required, consistent with how DB ordering is already used for history reads.

---

## Horizontal swipe detection

**Decision**: Implement swipe detection using `touchstart` / `touchend` events on the main content element. A gesture is classified as a "location switch" swipe if: `|deltaX| > |deltaY| × 2` (2:1 ratio, predominantly horizontal) AND `|deltaX| > 40px` (minimum displacement to filter micro-movements). No external library required.

**Rationale**: The existing codebase has no touch-gesture library. Adding one for a single use case is unnecessary. The 2:1 ratio + 40px threshold is a well-established pattern for distinguishing horizontal swipes from diagonal scrolls. This satisfies FR-014 (no vertical interference) and FR-016.

**Accessible alternative**: The Previous / Next controls (FR-020) are always-visible icon buttons in the main content header. They call the same `select()` store action as swipe, so they require no additional state.

---

## Accessibility for reorder controls

**Decision**: Move up and Move down are `<button>` elements with `aria-label="Move [area name] up"` / `aria-label="Move [area name] down"` and `disabled` attribute when at a boundary. Set as primary is a `<button>` with `aria-label="Set [area name] as primary"`. No `role="listbox"` or ARIA sortable pattern is required because the controls are explicit buttons (not drag-and-drop).

**Rationale**: ARIA drag-and-drop patterns (`aria-grabbed`, `aria-dropeffect`) are deprecated in ARIA 1.2 and complex to implement correctly. Explicit button controls with clear labels are simpler, better supported, and satisfy FR-004 and FR-012 without adding implementation risk.

**Position announcement**: After a successful reorder, the store re-fetches the location list. React re-renders the sidebar in the new order; the moved card's button regains focus via `autoFocus` or an explicit `focus()` call on the button that triggered the move, so the user's position in the list is communicated naturally.
