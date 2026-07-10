# RestaurantPos Backend API Reference

Base URL (local dev): `http://localhost:8080`
WebSocket endpoint: `http://localhost:8080/ws` (SockJS + STOMP)

> **CORS note**: the backend allows requests only from `http://localhost:3000` (both REST and the `/ws` WebSocket endpoint). The frontend **must** run on exactly `http://localhost:3000` — a different port (e.g. Vite's default `:5173`) will be blocked by the browser. If you need a different port, that's a one-line change in the backend's `SecurityConfig`/`WebSocketConfig`, not something fixable from the frontend.

---

## Authentication model

- **Customers**: a lightweight phone-number-only login (no password, no OTP) — `POST /api/customers/login`. This returns a `customerToken` that **must** be sent as `Authorization: Bearer <customerToken>` on the two session-entry endpoints (`create`/`join`) — it's a one-time gate to start/join a table's order list, not something needed on every subsequent request. Once you have a `sessionToken` from create/join, all cart/order endpoints work exactly as before with no customer token needed. The customer token is long-lived (30 days) — log in once, cache it, reuse it on the next visit rather than logging in every time. `POST /api/customers/logout` actually revokes the token server-side (not just a client-side "forget it") — useful on a shared device, or before logging in as a different number. Logging in again with the same or a different number afterward is unaffected; only that specific old token stops working.
- **Resuming a session** (e.g. app was closed, tab lost, page reloaded): after login, call `GET /api/customers/me/session` — if the phone number is a currently-present participant of an active session anywhere (host or joiner, doesn't matter), you get that session back directly, no PIN needed. Skip the whole create/join flow in that case and go straight to the order screen.
- **One active session per phone number**: a phone number can only be a currently-present participant of one session at a time, anywhere in the restaurant. `create`/`join` both 409 if the phone number is already active elsewhere. `POST /api/customers/me/session/leave` removes the phone number from its current session (and only that — the session itself, other participants, and the cart are untouched) so it's free to start or join somewhere else.
- **The session creator can't abandon an in-progress order**: if the phone number that *created* the session (not a joiner — joiners can always leave freely) tries to leave while any order in that session is at `PLACED` or later (submitted but not yet paid/cancelled), `leave` 409s with a message explaining why. This is deliberate — someone has to stay accountable for a table with food already in motion. Once every order in the session is either not-yet-submitted (`CART`), `CANCELLED`, or the bill has been generated (order rows are deleted at that point), the creator is free to leave like anyone else.
- **Auto-close on an empty, order-free table**: after any `leave` call, if the session's participant roster has hit zero (everyone, including the creator, has left) *and* there's no order at `PLACED` or later, the session closes and the table frees automatically — no cashier action needed. This mainly matters for a table that was created and then abandoned before anything was actually ordered. There's no dedicated notification for this — poll `GET /api/customers/me/session` (404→204 transition) or `GET /api/sessions/status/{qrToken}` to notice it happened.
- **Staff** (waiter/kitchen/cashier/admin): JWT bearer tokens obtained via `POST /api/auth/login`. Send as `Authorization: Bearer <token>` on every staff-role request.
- **Admin can also operate as waiter or cashier**: an `ADMIN` token is authorized on `/api/waiter/**` and `/api/cashier/**`/`/api/bills/**` in addition to `/api/admin/**` — deliberately **not** `/api/kitchen/**`. Every action taken this way is attributed to the admin's own staff account (`confirmedBy`, `changedBy`, etc.), exactly as if a waiter/cashier had done it themselves. No separate admin-flavored versions of those endpoints exist — reuse them as-is.
- **Admin security PIN**: separate from the login password, only relevant for `ADMIN` accounts, gates two sensitive actions (`free-session`, `reveal-participants` — see the Admin section below). A fresh admin account (including seeded `admin1`) has no PIN set — those two endpoints 409 with "Set your security PIN first" until `PATCH /api/admin/me/pin` is called. The PIN is re-checked on every single sensitive call (sent in that call's own request body) — there's no elevated "unlocked" session state to manage on the frontend.
- **Walk-in tables opened by a waiter**: a waiter can open a table's order list directly (`POST /api/waiter/tables/{tableId}/session`) for a customer who never touches their phone at all — no customer login involved. This is entirely transparent to the customer-facing app: if that table's customer *does* eventually scan the QR code, `GET /api/sessions/status/{qrToken}` still reports `activeSessionExists: false` and `POST /api/sessions/create/{qrToken}` still behaves like a normal create — under the hood it silently attaches that customer to the session the waiter already opened (same `sessionToken`, same PIN) instead of starting a fresh one, so the customer immediately sees whatever the waiter already entered via `GET /api/sessions/{sessionToken}/orders`. No frontend changes needed for this — it's a backend-only behavior, mentioned here so it's not surprising if `create` ever returns order history that "shouldn't" exist yet. Once a session's been claimed this way, everything (join, leave, creator-lock, etc.) behaves exactly like any other customer-created session.

---

## Enums (exact values, case-sensitive)

```
OrderStatus:         CART, PLACED, CONFIRMED, PREPARING, READY, SERVED, BILL_REQUESTED, PAID, CANCELLED
ItemStatus:          PENDING, CONFIRMED, PREPARING, READY, SERVED, CANCELLED
PaymentMethod:       CASH, CARD, UPI, OTHER
StaffRole:           WAITER, KITCHEN, CASHIER, ADMIN
TableOverviewStatus: AVAILABLE, AWAITING_ORDER, NEEDS_CONFIRMATION, PREPARING, READY_TO_SERVE, SERVED_AWAITING_BILL, BILL_REQUESTED
```

`OrderStatus.CART` is the shared draft basket before submission — it never appears in any staff-facing list (waiter/kitchen queries only ever return `PLACED`/`CONFIRMED`/etc.).

---

## Shared response shapes

### `OrderResponse` (returned by cart AND order endpoints — a cart is just an order with status `CART`)
```json
{
  "id": 1,
  "tableSessionId": 1,
  "tableNumber": "T1",
  "status": "PLACED",
  "placedAt": "2026-07-06T20:24:42.474607Z",
  "items": [ /* OrderItemResponse[] */ ]
}
```
`placedAt` is `null` while `status` is `CART` (not yet actually placed).

### `OrderItemResponse`
```json
{
  "id": 1,
  "menuItemId": 1,
  "menuItemName": "Paneer Tikka",
  "quantity": 2,
  "unitPrice": 220.00,
  "notes": "extra spicy",
  "itemStatus": "PENDING"
}
```
An item with `itemStatus: "CANCELLED"` stays in the list (soft-removed, e.g. by a waiter) — the UI should show it struck-through / labeled "removed", not hide it.

### `BillResponse`
```json
{
  "id": 1,
  "tableSessionId": 1,
  "tableNumber": "T1",
  "subtotal": 660.00,
  "tax": 33.00,
  "discount": 0.00,
  "total": 693.00,
  "paymentMethod": "CARD",
  "generatedAt": "2026-07-06T20:25:00.676478Z",
  "paidAt": "2026-07-06T20:25:00.841549Z",
  "items": [
    { "menuItemName": "Paneer Tikka", "quantity": 2, "unitPrice": 220.00, "lineTotal": 440.00 },
    { "menuItemName": "Masala Chai", "quantity": 3, "unitPrice": 60.00, "lineTotal": 180.00 }
  ]
}
```
`items` is a permanent itemized snapshot taken at generate time (name/qty/price as they were at that moment) — this is the full, self-contained receipt. It does **not** live-reference the original order, so it stays correct even though the underlying order data is deleted right after generation (see the `generate` endpoint note below).

### `BillRequestSummary`
```json
{
  "tableSessionId": 1,
  "tableNumber": "T1",
  "orders": [ /* OrderResponse[], each with status "BILL_REQUESTED" */ ]
}
```
`paymentMethod` and `paidAt` are `null` until the bill is actually paid.

### `SessionResponse` (returned by create, join, and `/api/customers/me/session` — identical shape, PIN always included)
```json
{ "sessionId": 1, "sessionToken": "91b65937-...", "tableNumber": "T1", "pin": "0163", "qrToken": "a91c92e8-..." }
```

### `SessionStatusResponse`
```json
{ "tableNumber": "T1", "activeSessionExists": false }
```

### `MenuCategoryResponse` / `MenuItemResponse`
```json
{
  "id": 1, "name": "Starters",
  "items": [
    { "id": 1, "name": "Paneer Tikka", "description": "Grilled cottage cheese skewers", "price": 220.00, "imageUrl": "https://res.cloudinary.com/.../paneer-tikka.jpg", "available": true }
  ]
}
```
`imageUrl` is a plain Cloudinary URL (or `null` if not set yet) — just use it directly as an `<img src>`, no special handling needed. Render a placeholder/fallback image client-side when it's `null`.

### `LoginResponse` (staff)
```json
{ "token": "eyJ...", "name": "Waiter One", "role": "WAITER" }
```

### `CustomerLoginResponse`
```json
{ "customerToken": "eyJ...", "customerId": 1, "phoneNumber": "9876543210" }
```

### `TableSummaryResponse` (the table-grid list view — same shape for waiter and cashier, one tile per table)
```json
{
  "tableId": 1,
  "tableNumber": "T1",
  "tableStatus": "OCCUPIED",
  "overviewStatus": "NEEDS_CONFIRMATION",
  "sessionId": 1,
  "openedAt": "2026-07-08T11:11:11.637435Z",
  "participantCount": 2,
  "ordersAwaitingConfirmation": 1,
  "itemsInKitchen": 0,
  "itemsReadyToServe": 0,
  "billRequested": false
}
```
`overviewStatus` is a server-computed priority summary of "what does this table need right now" — use it to color/badge the tile, don't try to infer urgency from the raw counts yourself. Priority order (first match wins): `NEEDS_CONFIRMATION` (an order is `PLACED`, waiting on a waiter — most urgent) → `READY_TO_SERVE` (an item is `READY`, food's getting cold) → `BILL_REQUESTED` → `PREPARING` (kitchen has it, nothing for staff to do) → `AWAITING_ORDER` (session open, nothing submitted yet) → `SERVED_AWAITING_BILL` (everything served, no bill requested yet) → `AVAILABLE` (no active session — every session-dependent field above is `null`).

### `WaiterTableDetailResponse` (waiter's drill-down for one table)
```json
{
  "tableId": 1, "tableNumber": "T1", "tableStatus": "OCCUPIED", "overviewStatus": "NEEDS_CONFIRMATION",
  "sessionId": 1, "pin": "0233", "openedAt": "2026-07-08T11:11:11.637435Z",
  "participantCount": 1, "billRequested": false,
  "orders": [ /* OrderResponse[], every submitted order for this session — same shape as GET /api/sessions/{sessionToken}/orders */ ]
}
```
`orders` carries real `orderId`/`itemId` values — use them to call the *existing* confirm/serve/edit endpoints directly from this view (e.g. tap an item in the drill-down → `PATCH /api/waiter/order-items/{itemId}/serve`). This is read-only additive access, not a new write surface.

### `CashierTableDetailResponse` (cashier's drill-down — same itemized order detail as the waiter's, still no `pin`, still no participant phone numbers)
```json
{
  "tableId": 1, "tableNumber": "T1", "tableStatus": "OCCUPIED", "overviewStatus": "BILL_REQUESTED",
  "sessionId": 1, "openedAt": "2026-07-08T11:11:11.637435Z",
  "participantCount": 1, "billRequested": true,
  "orderCount": 1, "estimatedTotal": 220.00,
  "orders": [ /* OrderResponse[], identical shape/content to WaiterTableDetailResponse.orders */ ]
}
```
`estimatedTotal` is a pre-tax subtotal across all non-cancelled items in the session (tax/discount aren't known until `generate` is actually called) — show it as "~₹220 (before tax)", not as a final total. `orders` carries the same real item-level detail the waiter sees (names, quantities, statuses) — the only things still withheld from the cashier are the session `pin` and participant phone numbers/names (`participantCount` stays headcount-only).

### `ApiErrorResponse` (shape of every non-2xx response body)
```json
{ "timestamp": "2026-07-06T19:08:47.079645300Z", "status": 404, "message": "No table found for this QR code" }
```
Always parse and surface `message` on error — don't swallow it.

---

## REST Endpoints

### Customer login

| Method | Path | Body | Returns | Notes |
|---|---|---|---|---|
| POST | `/api/customers/login` | `{ "phoneNumber": "9876543210" }` | `CustomerLoginResponse` | Find-or-create — same endpoint whether it's a new or returning number. `phoneNumber` must match `^[6-9]\d{9}$` (10-digit Indian mobile). No OTP, no verification — whatever's typed is trusted. |
| POST | `/api/customers/logout` | `Authorization: Bearer <customerToken>` header, no body | 200 empty body | Revokes that specific token server-side — it stops working immediately, everywhere, even before its 30-day expiry. 401 if the header's missing or the token's already invalid/revoked. Call this before letting a different phone number log in on the same device |
| GET | `/api/customers/me/session` | `Authorization: Bearer <customerToken>` header, no body | `SessionResponse` or empty | **200** + `SessionResponse` if this phone number is currently active in a session anywhere (host or joiner). **204** empty body if not — fall through to the normal QR → status → create/join flow. 401 if the token's missing/invalid/expired/revoked. Call this right after login to decide whether to skip straight to the order screen |
| POST | `/api/customers/me/session/leave` | `Authorization: Bearer <customerToken>` header, no body | 200 empty body | Removes this phone number from its current session's participant roster — frees it to `create`/`join` elsewhere. Does **not** affect the session itself, other participants, or the cart; they keep going. 409 if this phone number isn't currently active in any session. 409 if this phone number is the session's **creator** and any order in the session is at `PLACED` or later — see the note above. May trigger auto-close (see above) as a side effect if the roster hits zero and nothing's in flight |

### Public — Customer-facing

| Method | Path | Auth | Body | Returns | Notes |
|---|---|---|---|---|---|
| GET | `/api/menu` | none | — | `MenuCategoryResponse[]` | Full menu grouped by category |
| GET | `/api/sessions/status/{qrToken}` | none | — | `SessionStatusResponse` | Check before showing Create vs Join |
| POST | `/api/sessions/create/{qrToken}` | **`Bearer <customerToken>` required** | — | `SessionResponse` | 401 if the header is missing/invalid/expired; 409 if an order list is already active for this table; 409 if this phone number is already an active participant of a *different* session anywhere (see `/api/customers/me/session/leave`) |
| POST | `/api/sessions/join/{qrToken}` | **`Bearer <customerToken>` required** | `{ "pin": "1234" }` | `SessionResponse` | 401 if the header is missing/invalid/expired; 404 (generic "invalid PIN or no active list") on wrong PIN or no active session; 409 if this phone number is already an active participant of a *different* session. Re-joining a session you're already (or were previously) part of always succeeds, never 409s |
| GET | `/api/sessions/{sessionToken}/orders` | none | — | `OrderResponse[]` | Every **submitted** order for this session (all statuses except the current open `CART` draft — use `/api/cart/{sessionToken}` for that), oldest first. Call this on load/join/reconnect to hydrate a device's full order history in one shot — don't rely on having seen every WS event live, e.g. a new device joining mid-session, or a device that lost local state |
| GET | `/api/cart/{sessionToken}` | none | — | `OrderResponse` (status `CART`) | The shared, live cart. Read-only, always works regardless of bill-request state |
| POST | `/api/cart/{sessionToken}/items` | none | `{ "menuItemId": 1, "quantity": 2, "notes": "extra spicy" }` | `OrderResponse` | notes is optional/nullable. 409 "bill already requested" — see note below |
| PATCH | `/api/cart/{sessionToken}/items/{itemId}` | none | `{ "quantity": 3, "notes": "..." }` | `OrderResponse` | Both fields optional — only send what changed. `quantity <= 0` deletes the item from the cart instead of setting it (same effect as `DELETE`). 409 "bill already requested" — see note below |
| DELETE | `/api/cart/{sessionToken}/items/{itemId}` | none | — | `OrderResponse` | Removes from cart entirely (cart items are hard-removed, unlike waiter removals on placed orders). 409 "bill already requested" — see note below |
| POST | `/api/cart/{sessionToken}/submit` | none | — | `OrderResponse` (now status `PLACED`) | 409 if cart is empty. A fresh empty cart is opened automatically for the same session. 409 "bill already requested" — see note below |
| GET | `/api/orders/{orderId}` | none | — | `OrderResponse` | Poll a specific submitted order. 404 once the session's bill has been generated — the order row is deleted at that point, `BillResponse.items` (from `/api/bills/pending` etc.) is the permanent record from then on. Read-only, always works regardless of bill-request state |
| POST | `/api/orders/bill-request/{sessionToken}` | none | — | 200 empty body | 409 "The bill has already been requested for this table" if it already has been (distinct message from the "must be served" 409 below — don't conflate them). 409 "All orders must be served before requesting the bill" if any order is still in progress. Cancelled items/orders never block this — a fully-cancelled order, or an order with some cancelled items among otherwise-served ones, is treated as nothing-left-to-wait-on |

**Bill-requested lockout**: once any order in a session reaches `BILL_REQUESTED`, every *mutating* customer endpoint for that session (`POST`/`PATCH`/`DELETE` on `/api/cart/**`, and `/api/orders/bill-request/**` again) 409s with `"The bill has already been requested for this table — no further changes are allowed"` (or the equivalent message on the bill-request endpoint itself) — no adding items, no editing, no starting a new round, no re-requesting. Read-only endpoints (`GET /api/cart/**`, `GET /api/orders/**`) are unaffected. This lifts automatically — no separate flag to manage — the moment a cashier calls `PATCH /api/bills/{sessionId}/revert` (order goes back to `SERVED`) or generates the bill.

### Auth

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/api/auth/login` | `{ "username": "waiter1", "password": "password123" }` | `LoginResponse` |

### Waiter (`Authorization: Bearer <token>`, role `WAITER`)

| Method | Path | Body | Returns | Notes |
|---|---|---|---|---|
| GET | `/api/waiter/tables` | — | `TableSummaryResponse[]` | The full table grid, one tile per table (including tables with no active session — `overviewStatus: "AVAILABLE"`, every session field `null`). This is the new table-overview page's main list |
| GET | `/api/waiter/tables/{tableId}` | — | `WaiterTableDetailResponse` | Drill-down for one table — full order/item detail. `{tableId}` is the numeric table id, not `tableNumber` |
| POST | `/api/waiter/tables/{tableId}/request-bill` | — | 200 empty body | Same effect as the customer's `POST /api/orders/bill-request/{sessionToken}`, just keyed by `tableId` (the waiter doesn't have the customer's `sessionToken`). Same 409s apply ("already requested" / "must be served first") |
| POST | `/api/waiter/tables/{tableId}/session` | — | `SessionResponse` | Opens a fresh order list for a table with no active session — for walk-in customers who never touch a phone. Same shape as a customer's create/join response (`sessionId`/`sessionToken`/`pin`/`qrToken`). 409 if the table already has an active session. See the walk-in note in Authentication model above — if the table's customer later scans the QR, `create` transparently attaches them to *this same* session instead of conflicting with it |
| POST | `/api/waiter/tables/{tableId}/orders` | `{ "items": [ { "menuItemId": 1, "quantity": 2, "notes": "less spicy" } ] }` | `OrderResponse` | The waiter entering a verbal/walk-in order directly. One call places a whole round — `items` is a list, same per-item shape as `POST /api/cart/{sessionToken}/items`. Unlike the customer cart flow, this **skips `CART`/`PLACED`/confirm entirely**: the returned order is already `status: "CONFIRMED"` with every item `itemStatus: "CONFIRMED"`, and it's already visible to the kitchen — no separate confirm call needed, ever, for orders placed this way. 404 if the table has no active session (open one first via the endpoint above). 409 if the bill's already been requested for this table (same lockout as the customer cart). 404/409 per item if a `menuItemId` doesn't exist / isn't available |
| GET | `/api/waiter/orders/pending` | — | `OrderResponse[]` | Orders with status `PLACED`, awaiting confirmation |
| GET | `/api/waiter/orders/ready-to-serve` | — | `OrderResponse[]` | Orders with status `READY` |
| PATCH | `/api/waiter/orders/{orderId}/confirm` | — | `OrderResponse` | `PLACED` → `CONFIRMED`, sends to kitchen |
| PATCH | `/api/waiter/order-items/{itemId}/serve` | — | `OrderResponse` | Marks one item `SERVED` |
| DELETE | `/api/waiter/orders/{orderId}/items/{itemId}` | — | `OrderResponse` | Soft-removes an item (→ `CANCELLED`, stays visible) — **only while the order is still `PLACED`** (before confirming), 409 otherwise |
| PATCH | `/api/waiter/orders/{orderId}/items/{itemId}` | `{ "quantity": 3 }` | `OrderResponse` | Adjust quantity — **only while `PLACED`**, 409 otherwise. `quantity <= 0` soft-removes the item (same effect as the `DELETE` endpoint — `itemStatus` → `CANCELLED`, stays visible) instead of erroring |

### Kitchen (role `KITCHEN`)

| Method | Path | Body | Returns | Notes |
|---|---|---|---|---|
| GET | `/api/kitchen/queue` | — | `OrderResponse[]` | Orders with status `CONFIRMED` or `PREPARING` |
| PATCH | `/api/kitchen/order-items/{itemId}/status` | `{ "itemStatus": "PREPARING" }` or `{ "itemStatus": "READY" }` | `OrderResponse` | Kitchen may only set these two statuses |

### Cashier (role `CASHIER`)

| Method | Path | Body | Returns | Notes |
|---|---|---|---|---|
| GET | `/api/cashier/tables` | — | `TableSummaryResponse[]` | Same table grid as the waiter's, identical shape — the cashier's overview page main list |
| GET | `/api/cashier/tables/{tableId}` | — | `CashierTableDetailResponse` | Drill-down for one table — itemized orders + running subtotal, same order detail the waiter sees. Still **no** `pin`, still **no** participant phone numbers (`participantCount` stays headcount-only). `{tableId}` is the numeric table id, not `tableNumber` |
| GET | `/api/bills/requested` | — | `BillRequestSummary[]` | Sessions that have asked for the bill (order status `BILL_REQUESTED`) but don't have a generated `Bill` yet — this is the queue to work from before calling `generate` |
| PATCH | `/api/bills/{sessionId}/revert` | — | 200 empty body | Undoes a bill request: every `BILL_REQUESTED` order in that session goes back to `SERVED` (the only state it could have come from). For "customer pressed the button by mistake" or "wants to add one more item" — the cart is independent of billing state, so a new round can just be added normally afterward. 409 if nothing is pending for that session. Pushes the reverted order(s) to `/topic/table/{sessionId}` same as any other status change |
| GET | `/api/bills/pending` | — | `BillResponse[]` | Bills that have been generated but not yet paid |
| POST | `/api/bills/{sessionId}/generate` | `{ "taxRatePercent": 5, "discount": 0 }` (**both required**) | `BillResponse` | `{sessionId}` here is the numeric `sessionId`, not `sessionToken`. 400 if either field is missing/null. **Works from any state where every order is `SERVED` or later** — you do **not** need to call bill-request first: if the session isn't already `BILL_REQUESTED`, `generate` transitions it there automatically before generating, in one call (still validates every order is actually `SERVED` — 409 "All orders must be served before requesting the bill" if not). This is the cashier's "generate directly" shortcut from the table-overview page — internally it's still request-then-generate, just not two separate clicks. **One-shot and final**: this call snapshots every item onto the bill (see `BillResponse.items` above), then permanently deletes the session's order/item data — there is nothing left to recompute from, so calling `generate` again for the same session 409s ("already generated"). Whether the table frees up **now** or only once paid is a server-side config toggle (`app.billing.free-table-on-generate`) — check with whoever's running the backend which mode is active |
| PATCH | `/api/bills/{billId}/pay` | `{ "paymentMethod": "CARD" }` | `BillResponse` | Records payment. If the table wasn't already freed at generate time, this is where the session closes and the table becomes `AVAILABLE` |

### Admin (`Authorization: Bearer <token>`, role `ADMIN`)

Admin also has full access to every Waiter and Cashier endpoint above (see the note in Authentication model) — not repeated here.

**PIN-gating rule**: every admin write action below requires the security PIN (`pin` in the request body), **except** `PATCH /api/admin/menu/items/{id}/availability` — the one deliberate exemption, since toggling an item on/off is frequent, low-risk, and fully reversible. Everything else — creating, editing, deleting, or bulk-changing status on staff/menu/tables — needs it. Create/delete/bulk-status-change actions accept a **list** and a single `pin` covers the whole batch, specifically so bulk work (adding 10 menu items, retiring 3 tables) doesn't mean re-entering the PIN 10 times. Detail edits (rename one table, change one staff member's role, edit one item's price) stay single-item calls, still PIN-gated per call. Every batch action is **atomic all-or-nothing** — if any entry in the list fails validation, nothing in that call is written, and the error names every offending entry, not just the first one hit.

**Self-service:**

| Method | Path | Body | Returns | Notes |
|---|---|---|---|---|
| GET | `/api/admin/me` | — | `AdminMeResponse` — `{ staffId, name, username, role, pinSet }` | `pinSet` tells the frontend whether to show "Set PIN" or "Change PIN" |
| PATCH | `/api/admin/me/pin` | `{ "currentPassword": "...", "newPin": "1234" }` | 200 empty body | Sets or changes the admin's security PIN. `newPin` must be 4–6 digits. 401 if `currentPassword` is wrong |

**Table overview + audit:**

| Method | Path | Body | Returns | Notes |
|---|---|---|---|---|
| GET | `/api/admin/tables` | — | `TableSummaryResponse[]` | Same grid as waiter/cashier |
| GET | `/api/admin/tables/{tableId}` | — | `AdminTableDetailResponse` | Superset drill-down: `pin` + itemized `orders` + `estimatedTotal`, everything waiter and cashier separately see, in one response. Still headcount-only for participants — see `reveal-participants` below to go further |
| POST | `/api/admin/tables/{tableId}/free-session` | `{ "pin": "1234" }` | 200 empty body | **PIN-gated override.** Force-closes the table's active session and frees the table regardless of order/participant state — the escape hatch for a genuinely stuck table. Does **not** touch order rows or generate a bill; whatever existed stays in the DB, still linked to the now-`CLOSED` session, visible afterward via `/api/admin/bills`/order history. 409 if no PIN is set yet, 401 on wrong PIN, 404 if no active session |
| POST | `/api/admin/tables/{tableId}/reveal-participants` | `{ "pin": "1234" }` | `ParticipantResponse[]` — `{ customerId, phoneNumber, joinedAt, leftAt, isCreator }` | **PIN-gated.** The only way phone numbers are ever exposed — the normal `GET /api/admin/tables/{tableId}` above never includes them. Re-checks the PIN every single call, no caching. Includes everyone who's ever been part of the session, including those who've left |
| GET | `/api/admin/orders/{orderId}/history` | — | `OrderStatusEventResponse[]` — `{ orderId, fromStatus, toStatus, changedByName, changedAt }` | The audit trail for one order. Works even after the order's been deleted post-billing |
| GET | `/api/admin/bills?from=&to=` | — | `BillResponse[]` | Full bill history, not just pending — `from`/`to` optional ISO instants, omitted means all-time |

**Table management:**

| Method | Path | Body | Returns | Notes |
|---|---|---|---|---|
| GET | `/api/admin/tables/roster` | — | `TableManagementResponse[]` — `{ id, tableNumber, qrToken, status, retired }` | **All** tables including retired ones — this is the only place `qrToken` is exposed to staff (for printing/regenerating QR codes) |
| POST | `/api/admin/tables` | `{ pin, tables: [{ tableNumber }, ...] }` | `TableManagementResponse[]` | Adds one or many tables in one PIN-gated call, auto-generates each `qrToken` |
| PATCH | `/api/admin/tables/{tableId}` | `{ pin, tableNumber }` | `TableManagementResponse` | **Rename only** — retiring/reactivating moved to the two bulk endpoints below |
| POST | `/api/admin/tables/retire` | `{ pin, tableIds: [...] }` | 200 empty body | Bulk-retire. 409 (whole batch rejected) if any listed table has a currently-active session — free it first. Retiring is always soft (never a hard delete — `TableSession` has a permanent FK to the table) |
| POST | `/api/admin/tables/reactivate` | `{ pin, tableIds: [...] }` | 200 empty body | Bulk-reactivate — the reverse of retire |

**Staff accounts:**

| Method | Path | Body | Returns | Notes |
|---|---|---|---|---|
| GET | `/api/admin/staff` | — | `StaffResponse[]` — `{ id, name, username, role, active, email, contactNumber, address }` | Never includes password/PIN hashes. `email`/`contactNumber`/`address` shown here can come either from admin at creation time or from the staff member editing their own profile later (see `/api/staff/me` below) — admin can only set them at creation, not edit them afterward |
| POST | `/api/admin/staff` | `{ pin, staff: [{ name, username, password, role, email?, contactNumber?, address? }, ...] }` | `StaffResponse[]` | Create one or many accounts in one PIN-gated call. `email`/`contactNumber`/`address` are optional per entry — admin can fill them in up front or leave them for the staff member to add later via `/api/staff/me`. 409 (whole batch rejected) if any `username` is already taken **or** repeated within the same batch — usernames must be checked against each other, not just the DB, since two new hires in the same call could otherwise collide. `password` is a **default/initial** password only — each new hire is expected to change it themselves via `/api/staff/me/password` once they log in. Admin has no way to set someone else's password after account creation — see below |
| PATCH | `/api/admin/staff/{staffId}` | `{ pin, role? }` | `StaffResponse` | Single-account edit — **`role` only**. Admin cannot edit a staff member's name, username, or contact details after creation — all of that is self-service only, via `/api/staff/me`. Also **not** `active` (moved to the two bulk endpoints below) or password |
| POST | `/api/admin/staff/activate` | `{ pin, staffIds: [...] }` | 200 empty body | Bulk-reactivate — login unblocks immediately for everyone listed |
| POST | `/api/admin/staff/deactivate` | `{ pin, staffIds: [...] }` | 200 empty body | Bulk-deactivate — login blocks immediately (already-wired via `StaffUserDetails.isEnabled()`). 409 (whole batch rejected) if the acting admin's own id is anywhere in the list — remove it and resubmit |

Deactivation is always soft — there's no delete endpoint for staff. `OrderStatusEvent.changedBy` and `CustomerOrder.confirmedBy` are real FKs to `StaffUser`, so a staff row can never be safely hard-deleted once it's been involved in any order.

**Password resets are no longer an admin action.** Admin sets a default password only at account creation (above); after that, only the staff member themselves can change their own password, via `/api/staff/me/password` below. There's no "admin resets someone else's password" endpoint at all — if someone's genuinely locked out, an admin has to create a fresh account or the person needs a different recovery path outside this API.

### My Account (`Authorization: Bearer <token>`, **any staff role** — waiter/kitchen/cashier/admin alike)

Every staff member, regardless of role, manages their own profile and password here — this is not admin-only.

| Method | Path | Body | Returns | Notes |
|---|---|---|---|---|
| GET | `/api/staff/me` | — | `StaffAccountResponse` — `{ staffId, name, username, role, email, contactNumber, address }` | The logged-in staff member's own profile |
| PATCH | `/api/staff/me` | `{ name?, username?, email?, contactNumber?, address? }` | `StaffAccountResponse` | Partial update — only send changed fields. `name` and `username` both 409 if sent blank; `username` also 409s if another account already has it (same uniqueness check as admin creating a new account). `email`/`contactNumber`/`address` are always optional and can be cleared by sending an empty string. Changing `username` changes what to sign in with going forward — the current token stays valid, but the next login must use the new value |
| PATCH | `/api/staff/me/password` | `{ "currentPassword": "...", "newPassword": "..." }` | 200 empty body | Self-service password change — always requires proving the current password first. 401 if `currentPassword` is wrong. This is the **only** way any staff account's password ever changes after creation |

**Menu management:**

| Method | Path | Body | Returns | Notes |
|---|---|---|---|---|
| GET | `/api/admin/menu/categories` | — | `AdminMenuCategoryResponse[]` — `{ id, name, sortOrder }` | All categories, unlike the public `/api/menu` which only shows available items |
| POST | `/api/admin/menu/categories` | `{ pin, categories: [{ name, sortOrder? }, ...] }` | `AdminMenuCategoryResponse[]` | Create one or many categories in one PIN-gated call |
| PATCH | `/api/admin/menu/categories/{id}` | `{ pin, name?, sortOrder? }` | `AdminMenuCategoryResponse` | Single-category rename/reorder — always PIN-gated, no exemption for categories |
| POST | `/api/admin/menu/categories/delete` | `{ pin, categoryIds: [...] }` | 200 empty body | Bulk delete. 409 (whole batch rejected) if **any** listed category still has items — names every blocked category, not just the first, so you know exactly what to fix before retrying. Never cascade-deletes |
| GET | `/api/admin/menu/items` | — | `AdminMenuItemResponse[]` — `{ id, categoryId, categoryName, name, description, price, imageUrl, available }` | All items, including unavailable ones |
| POST | `/api/admin/menu/items` | `{ pin, items: [{ categoryId, name, description?, price, imageUrl?, available? }, ...] }` | `AdminMenuItemResponse[]` | Create one or many items in one PIN-gated call. `available` defaults to `true` per item |
| PATCH | `/api/admin/menu/items/{id}` | `{ pin, categoryId?, name?, description?, price?, imageUrl? }` | `AdminMenuItemResponse` | Single-item detail edit — always PIN-gated. **Does not touch `available`** — use the dedicated endpoint below for that |
| PATCH | `/api/admin/menu/items/{id}/availability` | `{ "available": true\|false }` | `AdminMenuItemResponse` | **The one PIN-free admin write action** — toggling an item on/off is frequent, low-risk, and fully reversible, so it's split into its own endpoint specifically so it never needs the PIN, regardless of what else you're doing |
| POST | `/api/admin/menu/items/delete` | `{ pin, itemIds: [...] }` | 200 empty body | Bulk delete. 409 (whole batch rejected) if **any** listed item is part of an in-progress order — names every blocked item; mark those unavailable instead via the endpoint above. Past bills are never affected either way (`BillLineItem` is a permanent name/price snapshot, no FK to `MenuItem`) |

**Analytics:** all three take optional `from`/`to` (ISO instant) query params, defaulting to all-time when omitted.

| Method | Path | Returns | Notes |
|---|---|---|---|
| GET | `/api/admin/analytics/revenue?from=&to=` | `RevenueSummaryResponse` — `{ from, to, totalRevenue, totalTax, totalDiscount, billCount, averageBillValue, dailyBreakdown: [{ date, revenue, billCount }] }` | Sourced from `Bill` rows, which are never deleted — always complete |
| GET | `/api/admin/analytics/top-items?from=&to=&limit=10` | `TopMenuItemResponse[]` — `{ menuItemName, quantitySold, revenue }` | Sorted by `quantitySold` descending, aggregated from bill line items |
| GET | `/api/admin/analytics/timing?from=&to=` | `OperationalTimingResponse` — `{ from, to, averageTimeToConfirmSeconds, averageTimeToServeSeconds, ordersSampled }` | Average `PLACED`→`CONFIRMED` and `CONFIRMED`→`SERVED` durations, computed from `OrderStatusEvent` — includes orders still in flight, not just billed ones. Either average field is `null` if no matching order pairs exist in range |

---

## WebSocket (STOMP over SockJS)

Connect: `new SockJS('http://localhost:8080/ws')` wrapped in a STOMP client (e.g. `@stomp/stompjs`). No authentication needed to connect — this endpoint is fully public.

| Topic | Payload | Who subscribes | When it fires |
|---|---|---|---|
| `/topic/waiter` | `OrderResponse` | Waiter dashboard | A new order is submitted (`CART`→`PLACED`) |
| `/topic/kitchen` | `OrderResponse` | Kitchen display | An order becomes `CONFIRMED`/`PREPARING`/`READY` |
| `/topic/cashier` | `CashierNotice` — `{ event: "BILL_REQUESTED"\|"BILL_REQUEST_REVERTED"\|"BILL_GENERATED"\|"BILL_PAID", tableSessionId, tableNumber, bill: BillResponse\|null }` | Cashier dashboard | Bill requested / reverted / generated / paid. `bill` is only non-null for the generated/paid events |
| `/topic/table/{sessionId}` | `OrderResponse` | Customer app (this specific session) | Any status change on one of this session's orders — waiter confirms, kitchen progresses, waiter edits a still-`PLACED` order, cashier reverts a bill request. Stops firing once the bill is generated (nothing left to push status updates about) — the frontend should treat this as the natural end of a visit, not a dropped connection |
| `/topic/cart/{sessionId}` | `OrderResponse` (status `CART`) | Customer app (this specific session) | Any participant adds/edits/removes a cart item, or a fresh cart opens after submit |
| `/topic/tables` | `TableSummaryResponse` | Waiter/cashier/admin table-overview page | **One table's** summary changed — fires on session create/join/leave, cart submit, order confirm, item status change (kitchen progress, waiter serve), and any bill-request/generate/revert/pay/free-session. Not scoped per table — every connected waiter/cashier/admin screen subscribes to this single shared topic and swaps out just the one tile matching the incoming `tableId`. This is a single global channel, unlike the other topics above which are per-session |

`{sessionId}` in the topic path is the **numeric** `sessionId` field from `SessionResponse`, not the `sessionToken` string. `/topic/tables` has no `{sessionId}`/`{tableId}` in its path — it's one topic for the whole restaurant, and each message payload carries its own `tableId` for the client to match against.

**Reliability requirement**: a subscription does not survive a dropped connection (phone screen lock, backgrounded tab, network blip), and reconnecting does not replay missed messages. Treat WS as a live-update layer on top of REST as the source of truth, not the only source of truth: fetch current state via REST on mount and on every WS reconnect (STOMP's `reconnectDelay` fires an `onConnect` callback on every reconnect, not just the first) and re-subscribe there too, and also reconcile on the browser's `visibilitychange`/`online` events so a backgrounded tab or dropped connection never leaves the UI stuck on stale data.

---

## Seeded data (fresh database)

**Tables** T1–T5, each with a unique `qrToken` — staff can fetch these via `GET /api/admin/tables/roster` now; there's still no endpoint that exposes them to customers, by design.

**Menu**: Starters (Paneer Tikka ₹220, Veg Spring Rolls ₹180), Main Course (Butter Chicken ₹340, Dal Makhani ₹260), Beverages (Masala Chai ₹60, Fresh Lime Soda ₹80). `imageUrl` is currently `null` on all seeded items until Cloudinary URLs are added.

**Staff logins** (password `password123` for all): `waiter1` (WAITER), `kitchen1` (KITCHEN), `cashier1` (CASHIER), `admin1` (ADMIN). Each seeded account also has a sample `email`/`contactNumber`/`address` filled in already (fictional placeholder data, e.g. `waiter1@restropos.example`) — editable by that staff member via `PATCH /api/staff/me` like any other account. `admin1` has **no security PIN set** — call `PATCH /api/admin/me/pin` before exercising `free-session`/`reveal-participants`.

**Customers**: none seeded — the customer table is empty until someone calls `POST /api/customers/login`, which creates a row on first use for any given phone number.
