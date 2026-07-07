You are building the frontend for an already-complete restaurant ordering backend (Java/Spring Boot + MySQL). The backend will not change — your job is a React frontend that talks to it exactly as documented below. Assume no other context beyond this document.

# Product overview

A restaurant puts a QR code on every physical table. Scanning it lets a group of people sitting together build one **shared cart** together on their own phones, submit it as an order, and track it live through confirmation, kitchen prep, serving, and billing. Staff (waiter, kitchen, cashier) each get their own dashboard.

## The core workflow

1. **Table QR → Create or Join.** Scanning the table's QR code lands on a page for that table. Call `GET /api/sessions/status/{qrToken}` to check if an order list is already active for this table.
   - If **not active**: show a "Create Order List" button. `POST /api/sessions/create/{qrToken}` returns `{ sessionId, sessionToken, tableNumber, pin }`. Display the 4-digit `pin` persistently somewhere on screen (a corner badge is fine) — every device in the group needs to be able to see and re-share it, not just the first person.
   - If **already active**: show a "Join Order List" flow — a 4-digit PIN input. `POST /api/sessions/join/{qrToken}` with `{ "pin": "1234" }` returns the *same* `sessionResponse` shape (including the pin) as create. Wrong PIN returns a 404 with a generic message — show it as-is, don't try to distinguish "wrong pin" from "no active session."
   - Persist `sessionToken` (and `sessionId`, `pin`, `tableNumber`) in `localStorage` so a page refresh doesn't lose the session.

2. **Shared cart.** Every device that has the `sessionToken` — host or joiner, doesn't matter, they're peers — sees and edits the *exact same* cart:
   - `GET /api/cart/{sessionToken}` to load it.
   - `POST /api/cart/{sessionToken}/items` to add `{ menuItemId, quantity, notes }`.
   - `PATCH .../items/{itemId}` to change quantity/notes, `DELETE .../items/{itemId}` to remove.
   - This must feel *live* — if your friend at the same table adds a samosa, it should show up on your phone within a second or two without you refreshing. That's what the WebSocket section below is for.

3. **Submit.** `POST /api/cart/{sessionToken}/submit` locks the current cart in as a real order (now visible to staff) and the response is that now-`PLACED` order. A **new empty cart opens automatically** for the same session — the group can keep adding a second round immediately. Once an order is submitted, its items are read-only to the customer (no more editing that specific order) — only the waiter can still adjust it, before they confirm it.

4. **Order tracking.** The customer should see all their orders for this visit (not just the current cart) and how each is progressing: `PLACED` (waiting on waiter) → `CONFIRMED` (waiter approved, sent to kitchen) → `PREPARING` → `READY` → `SERVED`. Individual items can also be `CANCELLED` (soft-removed by a waiter before confirming, e.g. item unavailable) — show cancelled items struck-through with a "removed by staff" label rather than hiding them, so the group understands why their total changed.

5. **Bill.** Once every order is `SERVED`, `POST /api/orders/bill-request/{sessionToken}` (409 if something isn't served yet — surface that message). This just flags the cashier; the actual bill is generated and paid by staff at the counter using their own dashboard.

## Staff dashboards

- **Login** (`/login` or similar): username/password → `POST /api/auth/login` → store the JWT, attach as `Authorization: Bearer <token>` on every subsequent staff request. Store `role` from the response to route to the right dashboard.
- **Waiter**: list of orders awaiting confirmation (`GET /api/waiter/orders/pending`) and ready-to-serve (`GET /api/waiter/orders/ready-to-serve`). Actions: confirm an order, mark an item served, and — only while an order is still `PLACED` — remove an item or change its quantity (`DELETE`/`PATCH /api/waiter/orders/{orderId}/items/{itemId}`). These edit actions should visibly disable/hide once the order moves past `PLACED`.
- **Kitchen**: queue of confirmed orders (`GET /api/kitchen/queue`), buttons to move each item `PREPARING` → `READY`.
- **Cashier**: pending bills (`GET /api/bills/pending`), generate a bill for a session (`POST /api/bills/{sessionId}/generate`, optional tax rate / discount override), then record payment (`PATCH /api/bills/{billId}/pay` with a payment method: CASH/CARD/UPI/OTHER).

# Full API reference

The complete endpoint list, request/response shapes, and enum values are in **`API_REFERENCE.md`** in the repo root — read it, it's the authoritative contract. Don't invent field names or guess response shapes; every DTO in that document is copied directly from the backend's actual Java records.

Quick orientation: base REST URL is configurable (env var, e.g. `VITE_API_BASE_URL`, default `http://localhost:8080`). Customer endpoints (`/api/menu`, `/api/sessions/*`, `/api/cart/*`, `/api/orders/*`) need no auth. Staff endpoints (`/api/waiter/*`, `/api/kitchen/*`, `/api/bills/*`) need the JWT bearer token from login.

# Required stack

- **React**, functional components + hooks. (Styling approach — CSS/Tailwind/whatever — is entirely your call, no constraint there.)
- **STOMP over SockJS** client — specifically `@stomp/stompjs` + `sockjs-client` — connecting to `{API_BASE_URL}/ws`. This isn't a style preference: it's the exact protocol the backend's Spring WebSocket layer speaks, so it has to be this pairing (or another STOMP+SockJS-compatible client), not a raw WebSocket or a different protocol.
- Both the REST base URL and the WS URL must be environment-configurable, not hardcoded, since they'll point somewhere different in production.

# WebSocket reliability — read this carefully, it's a real failure mode

A phone's WebSocket connection **will** drop silently sometimes — screen lock, the browser tab getting backgrounded, a flaky café wifi handoff. When that happens:
- Any message the server pushed while disconnected is **gone** — there's no replay/history, the server doesn't queue missed messages for you.
- Re-subscribing after reconnect does not retroactively deliver what you missed.

If you build this as "subscribe once on mount, update state from whatever arrives," a customer whose phone locked for 30 seconds during a busy kitchen rush could end up looking at a stale cart or a stuck-at-"PREPARING" order indefinitely, with no way to notice something's wrong.

**Required pattern — treat WebSocket as a live-update layer on top of REST as ground truth, never the only source of truth:**

1. On initial mount, fetch current state via REST first (e.g. `GET /api/cart/{sessionToken}` for the customer view, `GET /api/waiter/orders/pending` for waiter, `GET /api/kitchen/queue` for kitchen, `GET /api/bills/pending` for cashier), *then* open the WebSocket connection and subscribe.
2. Configure the STOMP client's built-in reconnection (`reconnectDelay` option in `@stomp/stompjs`) rather than writing your own reconnect loop.
3. In the `onConnect` callback — which fires on the *initial* connect **and every automatic reconnect** — always (a) re-subscribe to the relevant topic(s), since subscriptions don't survive a dropped connection, and (b) re-fetch current state via the same REST endpoint from step 1 to reconcile whatever might have been missed while disconnected. Don't only fetch once at app startup.
4. Additionally listen for the browser's `visibilitychange` event (and ideally `online`) and trigger the same REST reconcile-fetch when the tab becomes visible again / connectivity returns — don't rely solely on the socket layer to notice the tab was backgrounded; do it proactively, since a resumed tab is exactly when a customer is looking at the screen again and stale data is most visible and confusing.
5. WebSocket messages, when they do arrive, can be applied directly to state as a fast-path update — but they're an optimization for perceived latency, not the mechanism you depend on for correctness. If a message never arrives, the periodic REST reconciliation from steps 3–4 is what keeps the UI eventually correct.

In short: never assume "I subscribed once, so I'll hear about every future change." Always assume the connection might have silently dropped and rebuild from REST at every reconnect/refocus point, with WS just making the common case feel instant.

# CORS constraint: the frontend must run on port 3000

The backend's CORS policy allows requests only from `http://localhost:3000` (both REST endpoints and the `/ws` WebSocket handshake) — this is a hardcoded allowlist, not a wildcard. **Your dev server must run on exactly `http://localhost:3000`.** If you're scaffolding with a tool that defaults to a different port (e.g. Vite defaults to `:5173`, Create React App defaults to `:3000` already), explicitly configure the dev server port to `3000`. Running on any other port will get every request silently blocked by the browser with a CORS error, and that's not fixable from frontend code — the fix would be a change to the backend's allowed-origins list, which is out of scope for you here.

# Error handling

Every non-2xx response body has the shape `{ timestamp, status, message }` (see `ApiErrorResponse` in the API reference). Always parse and display `message` to the user (toast, inline banner, etc.) rather than a generic "something went wrong" — the backend's messages are already written to be user-relevant (e.g. "Cannot submit an empty cart", "Invalid PIN or no active order list for this table").

# Explicitly not needed

- No customer accounts, signup, or login — the session token + PIN model is the entire identity system for customers. Don't build a customer auth flow.
- No payment gateway integration — the cashier just records which payment method was used after collecting payment through their own existing means (cash/card machine). Don't build a checkout/payment form.
