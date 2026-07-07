# Trattoria — Restaurant POS Frontend

## Problem Statement
Build a professional, reactive React (no TypeScript) frontend for an already-built Java/Spring Boot restaurant POS backend. Customers arrive via table QR code, share a live collaborative cart, submit orders, track them in real time, and request bills. Staff (waiter/kitchen/cashier) work from dedicated dashboards. All real-time updates via STOMP + SockJS, with REST-as-source-of-truth reconciliation.

## Architecture
- **Frontend**: React 18 (CRA) + Tailwind CSS + React Router + Axios + `@stomp/stompjs` + `sockjs-client` + Sonner (toasts) + lucide-react (icons)
- **Backend** (not built here): Java Spring Boot at `http://localhost:8080`, WebSocket at `/ws`
- **State**: React hooks + localStorage for session persistence; no external state lib needed
- **Config**: `REACT_APP_API_BASE_URL` and `REACT_APP_WS_BASE_URL` in `frontend/.env`

## User Personas
1. **Diner (customer)** — arrives via QR `/?qr=<qrToken>`, enters phone, creates/joins table, shares cart with other diners, tracks orders, requests bill.
2. **Waiter** — confirms placed orders, edits/removes items while `PLACED`, marks items served when `READY`.
3. **Kitchen** — advances items `CONFIRMED` → `PREPARING` → `READY`.
4. **Cashier** — sees pending bills, generates bill (tax %, discount), records payment (CASH/CARD/UPI/OTHER).

## What's Been Implemented — Jan 2026
- Customer entry with QR-token validation and phone-number input (`/?qr=<token>`)
- Table access page: auto-detects existing sessions → Create or Join-by-PIN
- Order session view with three tabs (Menu / Cart / Orders):
  - Full menu browsing by category with add-to-cart
  - Live shared cart with quantity +/-, notes editor, item removal
  - Submit order → automatic fresh cart; live order/item status tracking with per-item badges
  - Persistent PIN badge with tap-to-copy
  - Request Bill flow with confirmation modal
- Staff login (JWT) with automatic role-based routing
- Waiter dashboard: pending confirm, ready-to-serve list, per-item edit/remove/serve
- Kitchen dashboard: item queue with Start Preparing → Mark Ready actions
- Cashier dashboard: pending bills, generate bill modal (tax/discount), payment modal (CASH/CARD/UPI/OTHER)
- Global glassmorphism dark **Debug Console** (bottom-right toggle) showing all API calls, WebSocket events, and errors, filterable by type
- STOMP over SockJS with automatic reconnection + REST reconciliation on `onConnect`, `visibilitychange`, and `online` events (as spec'd in AI_BUILD_PROMPT.md)
- Warm restaurant design (terracotta #D45D3F + forest green ink, Outfit + DM Sans, glassmorphism cards, ambient shadows)
- All interactive elements have `data-testid` attributes

## Not Yet Implemented / Backlog
- **P0**: Live end-to-end validation against the running Java backend (requires user to run backend + enable CORS for `http://localhost:3000`)
- **P1**: Menu item images (backend does not currently expose image URLs)
- **P2**: Waiter — visual grouping by table across multiple orders
- **P2**: Sound alerts on new orders (kitchen) and bill-ready (cashier)
- **P2**: PWA install + offline cart draft
- **P2**: Staff avatars / theme switch

## Files of Note
- `src/App.js` — router
- `src/lib/api.js` — all REST endpoints
- `src/lib/ws.js` — STOMP/SockJS client factory with reconciliation hooks
- `src/lib/debugStore.js` — in-memory event bus for Debug Console
- `src/lib/session.js` — localStorage helpers
- `src/views/CustomerEntry.js`, `TableAccess.js`, `OrderSession.js`
- `src/views/StaffLogin.js`, `WaiterDashboard.js`, `KitchenDashboard.js`, `CashierDashboard.js`
- `src/components/DebugPanel.js`, `StaffShell.js`, `ProtectedStaffRoute.js`

## Test QR Tokens (from user)
| Table | qrToken |
| :-- | :-- |
| T1 | a91c92e8-0f41-4812-aab4-99a7c495f9fd |
| T2 | 29c43117-9e33-488a-b1b7-d4697fad080d |
| T3 | 3ec47e18-ffd3-4332-a26c-020bfac4ea8f |
| T4 | 74361b7f-e2b7-4be8-9e8c-4c771fe7a78a |
| T5 | 5ff5263d-0e28-449d-b4e6-4ece752c33a5 |

## Backend CORS Reminder
Frontend runs at **http://localhost:3000** — the Spring Boot backend must add CORS mapping for this origin (see AI_BUILD_PROMPT.md).
