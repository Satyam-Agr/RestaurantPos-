# Build: Cashier Itemized View + Waiter Walk-In Order-Taking

Two incremental changes on top of the table-overview page you just built (`STAFF_TABLE_VIEW_PROMPT.md`). Both extend the same `TableGrid`/`TableCard`/`useTableOverview` foundation from that feature — no new pages, no new grid. Full contracts are in `API_REFERENCE.md` at the repo root (already updated); this prompt covers what to build and how it should feel.

---

## Change 1: Cashier now sees itemized orders too

We reversed the earlier "summary only" decision for the cashier. `CashierTableDetailResponse` now includes an `orders` field — identical shape and content to what the waiter's detail view already shows (order/item names, quantities, statuses).

**What to do**: in `CashierTableDetail.tsx`, render the `orders` list the same way `WaiterTableDetail.tsx` already does — same list/card layout for each order's items. If you factored out an "order items list" sub-component while building the waiter view, reuse it directly here rather than duplicating the markup.

**What's still withheld from the cashier** (unchanged, still intentional): no `pin` field in the response, and `participantCount` is still just a number — no names, no phone numbers. Don't add either of those to the cashier view.

---

## Change 2: Waiter can open a table and enter an order directly (walk-in / verbal orders)

For customers who never touch a phone at all — the waiter takes the order verbally at the table and enters it into the system themselves. Two new actions, both live in the **waiter's table detail view** (the same drill-down panel you already built for a table).

### Opening a table with no active session

Today, `TableCard`s for a table with `overviewStatus: "AVAILABLE"` presumably open into an empty/disabled detail view (no session to show). Add a **"Start Table"** button to that empty-state detail view (waiter only — the cashier's detail view doesn't get this button). Tapping it calls `POST /api/waiter/tables/{tableId}/session`, which returns the same `SessionResponse` shape as a customer's create/join (`sessionId`, `sessionToken`, `pin`, `qrToken`). After it succeeds:
- The detail view should transition into the normal "active session" layout for that table (it'll happen automatically once the `/topic/tables` push updates the tile to `AWAITING_ORDER` and you re-open/re-fetch the detail).
- Show the `pin` somewhere visible in the now-active detail view (e.g. "PIN: 5928") — the waiter may want to read it out if the table wants to track the order or add their own items later on their own phone. This isn't a new concept: it's the same PIN display you'd already show for any customer-created session in this view (if you're not already showing PIN in the waiter detail view, add it now — it's part of `WaiterTableDetailResponse` already).

**Important, so you don't build anything extra here**: if a customer at that table *does* eventually scan the QR code, they will not see a "join with PIN" prompt — they'll see the completely normal "Create Order List" flow (this is a backend behavior, not something you need to build or account for). The PIN only becomes relevant for a *second* person at that table joining after the first customer's phone has taken over. No changes needed to the customer-facing app for this at all — skip it entirely, it's invisible to that side.

### Placing an order directly

For any table with an active session (whether the waiter just opened it, or a customer created it via QR), add an **"Add Order"** button in the waiter's detail view. This opens an item picker:

- Reuse the same menu-browsing UI/data you already built for the customer app's ordering screen (`GET /api/menu` — public, no auth, same endpoint) — don't rebuild a second menu browser from scratch, just present it in a waiter-appropriate layout (this will likely be used on a phone or a small POS-style device at the table, so keep it compact and fast to tap through multiple items).
- Let the waiter build up a list of items with quantities and optional notes, same fields as the customer cart (`menuItemId`, `quantity`, `notes`).
- One "Place Order" action submits the whole list in a single call: `POST /api/waiter/tables/{tableId}/orders` with body `{ "items": [ { "menuItemId": 1, "quantity": 2, "notes": "..." }, ... ] }`.

**This is a one-shot action, not a cart.** There's no add-then-review-then-submit two-step here — build up the list locally in the picker's UI state, then submit everything at once when the waiter taps "Place Order". Once submitted:
- The response order already has `status: "CONFIRMED"` and every item `itemStatus: "CONFIRMED"` — it's already gone to the kitchen. There is no "confirm" step for the waiter to do afterward for this order, unlike customer-placed orders. Don't show a "pending confirmation" state for it, and don't show a confirm button for it in the order list — it's already past that point the moment it's placed.
- The table's tile will flip straight to `PREPARING` (or whatever the next-most-urgent state is) via the existing `/topic/tables` push — no special handling needed, this is the same reactive update pattern you already built.

**Error handling**: 404 if somehow called on a table with no active session (shouldn't normally happen since the button only appears when a session is active — but handle it gracefully, e.g. "This table doesn't have an active order list — start one first"). 409 if the bill's already been requested for that table (hide/disable the "Add Order" button when `overviewStatus` is `BILL_REQUESTED`, same as you already do for other actions that don't make sense post-bill-request). 404/409 per item if a menu item is missing/unavailable — surface `message` from the error response same as everywhere else in this app.

---

## Quick sanity checklist

- [ ] Cashier's table detail view shows real item names/quantities/statuses, not just the subtotal — pull up the same table in both waiter and cashier views and confirm they show matching order content.
- [ ] Cashier's detail view still never shows a PIN or a phone number anywhere.
- [ ] "Start Table" only appears for `AVAILABLE` tables; "Add Order" only appears for tables with an active session and disappears once `overviewStatus` is `BILL_REQUESTED`.
- [ ] A waiter-placed order never shows a "confirm" button — it's already confirmed the moment it's placed.
- [ ] Placing a walk-in order, then opening the kitchen display (if you're testing end-to-end), shows the new order already sitting in the kitchen queue with no confirm step having happened.
