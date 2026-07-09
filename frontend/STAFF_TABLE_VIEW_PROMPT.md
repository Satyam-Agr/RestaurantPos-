# Build: Staff Table-Overview View (Waiter + Cashier)

This is an incremental feature for the existing RestaurantPos frontend. Everything up to your previous update is assumed already built and working (customer ordering flow, waiter pending/ready-to-serve queues, kitchen queue, cashier bill queues, all WS wiring). Read this whole prompt before writing code — it defines a shared component layer that both roles reuse, and that an admin view will reuse later.

Full endpoint/DTO/WS contracts are in `API_REFERENCE.md` at the repo root (already updated for this feature) — treat it as the source of truth for exact field names and status codes. This prompt is about *what to build and how it should feel*, not a restatement of the API shapes.

---

## What this feature is

A new page for waiter and cashier: **"Tables"** — a single screen showing every table in the restaurant as a card/tile in a grid. Click a tile → a detail panel opens for that table. From the detail panel, staff can act (confirm/serve/request-bill for the waiter; generate-bill for the cashier) without navigating away. No more hunting through separate pending/ready-to-serve lists to figure out "what's going on at table 4" — this page answers that in one glance.

**Waiter's tile grid and detail view**: full visibility. Sees every order, every item, item statuses, the session PIN.

**Cashier's tile grid and detail view**: same grid, but the detail view is deliberately reduced — a running subtotal estimate and order count, **no** itemized order contents, **no** participant phone numbers (headcount only). The cashier doesn't need to know *what* was ordered to bill it — they need to know *how much* and *whether it's ready to bill*. Do not build an itemized cashier order view; this is intentional, not a placeholder.

**Cashier's "generate bill" button** replaces the waiter's separate "request bill" step: one button, one confirm dialog, done. (The backend still passes through the `BILL_REQUESTED` state internally — you don't need to model that as two steps in the UI, the `POST /api/bills/{sessionId}/generate` call now handles both automatically.)

---

## Directory structure

Build this so an admin view (not yet built, coming later) can reuse the shared pieces without a rewrite. Structure:

```
src/features/tables/
  components/
    TableGrid.tsx           # shared — renders the grid of TableCard
    TableCard.tsx           # shared — one tile, color-coded by overviewStatus
    StatusBadge.tsx         # shared — small colored pill for overviewStatus
  hooks/
    useTableOverview.ts     # shared — fetch + WS subscribe + reconcile (the data layer, role-agnostic)
  waiter/
    WaiterTablesPage.tsx    # waiter's page: TableGrid + WaiterTableDetail
    WaiterTableDetail.tsx   # full order/item detail + confirm/serve/request-bill actions
  cashier/
    CashierTablesPage.tsx   # cashier's page: TableGrid + CashierTableDetail
    CashierTableDetail.tsx  # summary + running total + generate-bill action
  admin/
    # empty for now — reserved for a future AdminTablesPage.tsx that reuses
    # TableGrid/TableCard/useTableOverview exactly like waiter/cashier do
```

Adjust to match your existing project's folder conventions (e.g. if you use `pages/` instead of `features/`), but keep the principle: **grid, card, badge, and the data-fetching hook are role-agnostic and live in one shared place**; each role only supplies its own detail panel and page shell.

`useTableOverview` should not care who's calling it — no role parameter, no role-specific logic. It just returns the list of tables and keeps it live. The two endpoints (`/api/waiter/tables` and `/api/cashier/tables`) return the identical `TableSummaryResponse` shape, so the same hook works for both — just point it at the right base path (or pass the fetch function in), whichever fits your existing API-client pattern.

---

## The two pages

### `WaiterTablesPage`
- `TableGrid` fed by `useTableOverview` pointed at `GET /api/waiter/tables`.
- Click a tile → fetch `GET /api/waiter/tables/{tableId}` → open `WaiterTableDetail` (a side panel, modal, or route — whatever matches your existing navigation pattern for detail views elsewhere in the app).
- `WaiterTableDetail` shows: table number, PIN, participant count, and the full `orders` list with every item's status. Each order/item that's actionable gets the same buttons your existing waiter queue screens already have — confirm an order, mark an item served — wired to the *same existing endpoints* you already call elsewhere (`PATCH /api/waiter/orders/{orderId}/confirm`, `PATCH /api/waiter/order-items/{itemId}/serve`, etc.). This page is a new way to reach those actions, not a new set of actions.
- Add one new button here that doesn't exist elsewhere: **"Request Bill"**, calling `POST /api/waiter/tables/{tableId}/request-bill`. Show it only when the table's `overviewStatus` is `SERVED_AWAITING_BILL` (nothing left to serve, nothing billed yet) — disable or hide it otherwise so a waiter can't request a bill mid-meal.
- After any action succeeds, don't manually patch local state — let the WS push (see below) update the tile, and re-fetch the open detail panel's data (or just let it reflect the next WS message for that table).

### `CashierTablesPage`
- `TableGrid` fed by `useTableOverview` pointed at `GET /api/cashier/tables`.
- Click a tile → fetch `GET /api/cashier/tables/{tableId}` → open `CashierTableDetail`.
- `CashierTableDetail` shows: table number, participant count (number only), order count, and `estimatedTotal` labeled clearly as an estimate before tax (e.g. "Est. ₹440 (before tax)") — never present it as a final payable amount.
- One action button: **"Generate Bill"**, enabled once `overviewStatus` is `SERVED_AWAITING_BILL` or `BILL_REQUESTED` (both are valid — see the generate endpoint's note in `API_REFERENCE.md`, it now auto-transitions either way). Clicking it should open your existing generate-bill form (tax %, discount — same fields/flow you already built for the cashier's bill queue) and submit to `POST /api/bills/{sessionId}/generate` exactly as before. Reuse that existing form/modal rather than building a second one.
- After a successful generate, the table's `overviewStatus` will flip to `AVAILABLE` via WS — close the detail panel automatically (there's nothing left to show for that table).

---

## Color-coding (match the priority hierarchy)

`overviewStatus` is already priority-ordered by the backend — most urgent first. Map colors so the grid is scannable at a glance without reading text:

| `overviewStatus` | Meaning | Suggested treatment |
|---|---|---|
| `NEEDS_CONFIRMATION` | Order placed, waiter hasn't confirmed | Red/urgent — this is blocking the kitchen |
| `READY_TO_SERVE` | Food's ready, getting cold | Orange/urgent |
| `BILL_REQUESTED` | Waiting on cashier | Yellow/attention |
| `PREPARING` | Kitchen has it, nothing to do | Blue/calm, informational |
| `AWAITING_ORDER` | Table occupied, nothing ordered yet | Grey/neutral |
| `SERVED_AWAITING_BILL` | Everything served, no bill yet | Blue/calm |
| `AVAILABLE` | No active session | Light grey / muted, visually "empty" |

Exact colors are your call — this is a suggested urgency order, not a palette spec. The important part: `NEEDS_CONFIRMATION` and `READY_TO_SERVE` should visually jump out; `AVAILABLE` tables should visually recede so they don't compete for attention.

---

## Making it WebSocket-responsive (in plain terms)

You already have a working STOMP/SockJS client elsewhere in the app (customer cart/order screens) — reuse that same connection/client setup, just add one more subscription.

**The idea**: a normal `fetch`/`GET` is a one-time question-and-answer. A WebSocket is a connection that stays open, so the server can push new information the moment something changes, without the browser having to ask again. For this page, there's exactly **one topic** to subscribe to: `/topic/tables`. Every time anything changes anywhere in the restaurant — an order's confirmed, an item's marked ready, a bill's requested or generated, someone joins or leaves a table — the backend recomputes that **one affected table's** summary and pushes it down this single channel. Every waiter and cashier screen that's subscribed receives the same message and updates just that one tile.

**Implementation shape for `useTableOverview`:**
1. On mount: `GET` the full list (`/api/waiter/tables` or `/api/cashier/tables`) and store it as state — this is your starting point, always fetched fresh, never assumed.
2. Also on mount: subscribe to `/topic/tables`. Each incoming message is a single `TableSummaryResponse` — find the table in your state array with the matching `tableId` and replace just that entry (don't refetch the whole list on every message, that defeats the point).
3. **Reconnect handling — this is the part that's easy to skip and shouldn't be.** STOMP client libraries (e.g. `@stomp/stompjs`) fire an `onConnect` callback every time the connection is (re)established, not just the first time — phone screen locks, wifi drops, tabs get backgrounded, all disconnect the socket, and messages sent while disconnected are gone forever, never replayed. So: every time `onConnect` fires (including reconnects), re-run step 1 (full REST refetch) before resuming step 2 (resubscribe). This means a missed message is never a permanently-wrong tile — worst case it's a few seconds stale until the next reconnect fetches fresh state.
4. Also worth wiring (cheap insurance, same idea as #3): listen for the browser's `visibilitychange` and `online` events and trigger a REST refetch when the tab becomes visible again or the network comes back — covers the case where the socket *thinks* it's still connected but the tab was frozen/backgrounded long enough to miss messages.
5. Unsubscribe/cleanup on unmount, same as you're already doing for the other topic subscriptions in this app.

If you already have a shared "WS store" or context provider pattern from building the earlier features (cart/order live updates), extend that pattern here rather than inventing a new one — this topic behaves the same way (subscribe, patch one entity by id, reconcile on reconnect) as the ones you've already built.

---

## Responsive design direction

Staff may use this on a phone at the table, a tablet at the host stand, or a desktop at the cashier counter — design for all three:

- **Grid**: responsive card grid — comfortably 4-6 columns on desktop, 2-3 on tablet, single or double column on phone. Cards should be tappable/clickable with generous touch targets (this will be used on mobile devices, not just desktop with a mouse).
- **Detail panel**: on desktop, a side panel or modal that doesn't lose the grid behind it (so staff can glance at other tables while one is open) is nicer than a full-page navigation; on mobile, a full-screen view or bottom sheet is more practical. Use whatever pattern you've already established elsewhere in this app for list→detail navigation — consistency with the rest of the app matters more than any specific pattern here.
- **Card content**: table number should be the most prominent element (largest text) — that's what staff scan for first. The status badge/color should be immediately visible without opening the card. Secondary info (participant count, item counts) can be smaller/secondary.
- Keep tap targets and font sizes comfortable at phone width — this isn't a dense analytics dashboard, it's a glanceable, fast-moving operational screen.

---

## Explicit "do not build" list

- No itemized order/item view in the cashier's detail panel — subtotal + count only, by design (confirmed decision, not a placeholder to fill in later).
- No participant phone numbers or names anywhere in this view, either role — headcount only.
- No new payment-recording UI here — the cashier's existing `PATCH /api/bills/{billId}/pay` flow (wherever you already built it, e.g. the pending-bills queue) is unchanged and this page doesn't duplicate it. Once a bill is generated from this page, the table just goes back to `AVAILABLE` and disappears from anything "needing attention" — payment happens in the cashier's existing bill-queue screen.
- No separate "request bill" step for the cashier — one button (`generate`) does both, per the backend's auto-transition behavior.
- Don't build a second generate-bill form for the cashier detail panel — reuse the one that already exists for the cashier's current bill-queue screen.

---

## Quick sanity checklist before calling this done

- [ ] A fresh table with no session shows `AVAILABLE`, greyed out, no click-through to a broken detail view (either disable the click or show a clean "no active session" state).
- [ ] Opening the waiter detail view for a table with a `PLACED` order shows the item, and tapping the existing confirm button actually confirms it (reusing existing endpoint/logic).
- [ ] The "Request Bill" button on the waiter detail view is hidden/disabled except when `overviewStatus === "SERVED_AWAITING_BILL"`.
- [ ] The cashier detail view never renders an item name, quantity, or phone number anywhere, for any table.
- [ ] Killing wifi for a few seconds and restoring it causes a full list refetch (check network tab) before the WS resumes pushing — not just a silent gap.
- [ ] Grid and detail panel both work at a phone-width viewport without horizontal scrolling or unreadable text.
