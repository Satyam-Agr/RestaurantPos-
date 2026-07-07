# Trattoria — Restaurant POS Frontend

A professional, warm-toned React frontend for an already-built Spring Boot restaurant POS backend. Customers order collaboratively from a shared cart via table QR codes; staff manage orders through role-specific dashboards.

## Quick Start

```bash
cd frontend
yarn install
yarn start
```

The app runs at **http://localhost:3000**.
The backend is expected at **http://localhost:8080** (configurable via `.env`).

> ⚠️ **Enable CORS on the backend** for `http://localhost:3000` — this app makes REST + WebSocket calls to your Spring Boot server.

## Config

`frontend/.env`:
```
REACT_APP_API_BASE_URL=http://localhost:8080
REACT_APP_WS_BASE_URL=http://localhost:8080/ws
```

## Routes

### Customer
| URL | Purpose |
| :-- | :-- |
| `/?qr=<qrToken>` | Landing — enter phone number |
| `/table?qr=<qrToken>` | Create or Join the table's order list |
| `/order` | Menu, shared cart, submitted-order tracking, request bill |

### Staff
| URL | Purpose |
| :-- | :-- |
| `/staff/login` | Username/password sign-in (JWT) |
| `/staff/waiter` | Pending & ready-to-serve, item confirm/serve/edit/remove |
| `/staff/kitchen` | Cookable item queue (CONFIRMED → PREPARING → READY) |
| `/staff/cashier` | Pending bills, generate bill, record payment |

## Test QR Tokens

| Table | qrToken |
| :-- | :-- |
| T1 | `a91c92e8-0f41-4812-aab4-99a7c495f9fd` |
| T2 | `29c43117-9e33-488a-b1b7-d4697fad080d` |
| T3 | `3ec47e18-ffd3-4332-a26c-020bfac4ea8f` |
| T4 | `74361b7f-e2b7-4be8-9e8c-4c771fe7a78a` |
| T5 | `5ff5263d-0e28-449d-b4e6-4ece752c33a5` |

Example: [http://localhost:3000/?qr=a91c92e8-0f41-4812-aab4-99a7c495f9fd](http://localhost:3000/?qr=a91c92e8-0f41-4812-aab4-99a7c495f9fd)

## Debug Console

Every screen has a **Debug** button in the bottom-right corner. Tap to open a live log of every API request, WebSocket event, and error (with the exact backend error message). Filter by `error`, `ws`, or `info`. Great for tracing CORS or auth issues while wiring up the backend.

## Real-time Strategy

Per the build prompt, **REST is the source of truth** and WebSocket is a latency optimisation. The client:
- Subscribes to STOMP topics after each connect
- Re-fetches from REST on `onConnect`, tab `visibilitychange` (back to foreground), and browser `online` events

## Stack

- React 18 (Create React App, JavaScript — no TypeScript)
- Tailwind CSS 3
- React Router 6
- Axios · @stomp/stompjs · sockjs-client
- Sonner (toasts) · lucide-react (icons)
