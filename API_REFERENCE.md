# RestaurantPos Backend API Reference

Base URL (local dev): `http://localhost:8080`
WebSocket endpoint: `http://localhost:8080/ws` (SockJS + STOMP)

> **CORS note**: the backend allows requests only from `http://localhost:3000` (both REST and the `/ws` WebSocket endpoint). The frontend **must** run on exactly `http://localhost:3000` — a different port (e.g. Vite's default `:5173`) will be blocked by the browser. If you need a different port, that's a one-line change in the backend's `SecurityConfig`/`WebSocketConfig`, not something fixable from the frontend.

---

## Authentication model

- **Customers**: a lightweight phone-number-only login (no password, no OTP) — `POST /api/customers/login`. This returns a `customerToken` that **must** be sent as `Authorization: Bearer <customerToken>` on the two session-entry endpoints (`create`/`join`) — it's a one-time gate to start/join a table's order list, not something needed on every subsequent request. Once you have a `sessionToken` from create/join, all cart/order endpoints work exactly as before with no customer token needed. The customer token is long-lived (30 days) — log in once, cache it, reuse it on the next visit rather than logging in every time.
- **Staff** (waiter/kitchen/cashier/admin): JWT bearer tokens obtained via `POST /api/auth/login`. Send as `Authorization: Bearer <token>` on every staff-role request.

---

## Enums (exact values, case-sensitive)

```
OrderStatus:   CART, PLACED, CONFIRMED, PREPARING, READY, SERVED, BILL_REQUESTED, PAID, CANCELLED
ItemStatus:    PENDING, CONFIRMED, PREPARING, READY, SERVED, CANCELLED
PaymentMethod: CASH, CARD, UPI, OTHER
StaffRole:     WAITER, KITCHEN, CASHIER, ADMIN
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
  "subtotal": 660.00,
  "tax": 33.00,
  "discount": 0.00,
  "total": 693.00,
  "paymentMethod": "CARD",
  "generatedAt": "2026-07-06T20:25:00.676478Z",
  "paidAt": "2026-07-06T20:25:00.841549Z"
}
```

### `BillRequestSummary`
```json
{
  "tableSessionId": 1,
  "tableNumber": "T1",
  "orders": [ /* OrderResponse[], each with status "BILL_REQUESTED" */ ]
}
```
`paymentMethod` and `paidAt` are `null` until the bill is actually paid.

### `SessionResponse` (returned by both create and join — identical shape, PIN always included)
```json
{ "sessionId": 1, "sessionToken": "91b65937-...", "tableNumber": "T1", "pin": "0163" }
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

### Public — Customer-facing

| Method | Path | Auth | Body | Returns | Notes |
|---|---|---|---|---|---|
| GET | `/api/menu` | none | — | `MenuCategoryResponse[]` | Full menu grouped by category |
| GET | `/api/sessions/status/{qrToken}` | none | — | `SessionStatusResponse` | Check before showing Create vs Join |
| POST | `/api/sessions/create/{qrToken}` | **`Bearer <customerToken>` required** | — | `SessionResponse` | 401 if the header is missing/invalid/expired; 409 if an order list is already active for this table |
| POST | `/api/sessions/join/{qrToken}` | **`Bearer <customerToken>` required** | `{ "pin": "1234" }` | `SessionResponse` | 401 if the header is missing/invalid/expired; 404 (generic "invalid PIN or no active list") on wrong PIN or no active session |
| GET | `/api/cart/{sessionToken}` | none | — | `OrderResponse` (status `CART`) | The shared, live cart |
| POST | `/api/cart/{sessionToken}/items` | none | `{ "menuItemId": 1, "quantity": 2, "notes": "extra spicy" }` | `OrderResponse` | notes is optional/nullable |
| PATCH | `/api/cart/{sessionToken}/items/{itemId}` | none | `{ "quantity": 3, "notes": "..." }` | `OrderResponse` | Both fields optional — only send what changed. `quantity <= 0` deletes the item from the cart instead of setting it (same effect as `DELETE`) |
| DELETE | `/api/cart/{sessionToken}/items/{itemId}` | none | — | `OrderResponse` | Removes from cart entirely (cart items are hard-removed, unlike waiter removals on placed orders) |
| POST | `/api/cart/{sessionToken}/submit` | none | — | `OrderResponse` (now status `PLACED`) | 409 if cart is empty. A fresh empty cart is opened automatically for the same session |
| GET | `/api/orders/{orderId}` | none | — | `OrderResponse` | Poll a specific submitted order |
| POST | `/api/orders/bill-request/{sessionToken}` | none | — | 200 empty body | 409 if any order is still in progress (not yet `SERVED`). Cancelled items/orders never block this — a fully-cancelled order, or an order with some cancelled items among otherwise-served ones, is treated as nothing-left-to-wait-on |

### Auth

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/api/auth/login` | `{ "username": "waiter1", "password": "password123" }` | `LoginResponse` |

### Waiter (`Authorization: Bearer <token>`, role `WAITER`)

| Method | Path | Body | Returns | Notes |
|---|---|---|---|---|
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
| GET | `/api/bills/requested` | — | `BillRequestSummary[]` | Sessions that have asked for the bill (order status `BILL_REQUESTED`) but don't have a generated `Bill` yet — this is the queue to work from before calling `generate` |
| PATCH | `/api/bills/{sessionId}/revert` | — | 200 empty body | Undoes a bill request: every `BILL_REQUESTED` order in that session goes back to `SERVED` (the only state it could have come from). For "customer pressed the button by mistake" or "wants to add one more item" — the cart is independent of billing state, so a new round can just be added normally afterward. 409 if nothing is pending for that session. Pushes the reverted order(s) to `/topic/table/{sessionId}` same as any other status change |
| GET | `/api/bills/pending` | — | `BillResponse[]` | Bills that have been generated but not yet paid |
| POST | `/api/bills/{sessionId}/generate` | `{ "taxRatePercent": 5, "discount": 0 }` (**both required**) | `BillResponse` | `{sessionId}` here is the numeric `sessionId`, not `sessionToken`. 400 if either field is missing/null — the frontend is responsible for prefilling sensible defaults, the API no longer applies its own |
| PATCH | `/api/bills/{billId}/pay` | `{ "paymentMethod": "CARD" }` | `BillResponse` | Closes the session, frees the table back to `AVAILABLE` |

---

## WebSocket (STOMP over SockJS)

Connect: `new SockJS('http://localhost:8080/ws')` wrapped in a STOMP client (e.g. `@stomp/stompjs`). No authentication needed to connect — this endpoint is fully public.

| Topic | Payload | Who subscribes | When it fires |
|---|---|---|---|
| `/topic/waiter` | `OrderResponse` | Waiter dashboard | A new order is submitted (`CART`→`PLACED`) |
| `/topic/kitchen` | `OrderResponse` | Kitchen display | An order becomes `CONFIRMED`/`PREPARING`/`READY` |
| `/topic/cashier` | `CashierNotice` — `{ event: "BILL_REQUESTED"\|"BILL_REQUEST_REVERTED"\|"BILL_GENERATED"\|"BILL_PAID", tableSessionId, tableNumber, bill: BillResponse\|null }` | Cashier dashboard | Bill requested / reverted / generated / paid. `bill` is only non-null for the generated/paid events |
| `/topic/table/{sessionId}` | `OrderResponse` | Customer app (this specific session) | Any status change on one of this session's orders — waiter confirms, kitchen progresses, waiter edits a still-`PLACED` order |
| `/topic/cart/{sessionId}` | `OrderResponse` (status `CART`) | Customer app (this specific session) | Any participant adds/edits/removes a cart item, or a fresh cart opens after submit |

`{sessionId}` in the topic path is the **numeric** `sessionId` field from `SessionResponse`, not the `sessionToken` string.

**Reliability requirement**: a subscription does not survive a dropped connection (phone screen lock, backgrounded tab, network blip), and reconnecting does not replay missed messages. Treat WS as a live-update layer on top of REST as the source of truth, not the only source of truth: fetch current state via REST on mount and on every WS reconnect (STOMP's `reconnectDelay` fires an `onConnect` callback on every reconnect, not just the first) and re-subscribe there too, and also reconcile on the browser's `visibilitychange`/`online` events so a backgrounded tab or dropped connection never leaves the UI stuck on stale data.

---

## Seeded data (fresh database)

**Tables** T1–T5, each with a unique `qrToken` (query the DB or your own admin tooling to get these — there's currently no endpoint that lists tables/QR tokens for customers, by design).

**Menu**: Starters (Paneer Tikka ₹220, Veg Spring Rolls ₹180), Main Course (Butter Chicken ₹340, Dal Makhani ₹260), Beverages (Masala Chai ₹60, Fresh Lime Soda ₹80). `imageUrl` is currently `null` on all seeded items until Cloudinary URLs are added.

**Staff logins** (password `password123` for all): `waiter1` (WAITER), `kitchen1` (KITCHEN), `cashier1` (CASHIER), `admin1` (ADMIN).

**Customers**: none seeded — the customer table is empty until someone calls `POST /api/customers/login`, which creates a row on first use for any given phone number.
