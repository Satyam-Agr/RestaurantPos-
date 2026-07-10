# Build: Admin Console (Management + Operate views)

A new role surface on top of everything already built. `ADMIN` is a real, working backend role now — full contracts are in `API_REFERENCE.md` at the repo root (already updated, see the "Admin" and "My Account" sections and the Authentication model notes at the top). This prompt covers what to build and how it should feel; don't restate field names from the reference, just use them.

Read this whole prompt before writing code.

**One important scope note before the admin-specific parts**: this build also introduces a "My Account" page that is **not admin-only** — every staff role (waiter, kitchen, cashier, admin) gets one, for editing their own profile and changing their own password. Build that as a shared, global piece of the app (reachable from wherever your header/nav already lives on every role's screen), not tucked inside the admin console.

---

## My Account (all roles — build this regardless of which role screens exist today)

Every logged-in staff member, whatever their role, needs a way to see and edit their own profile and change their own password.

- **Admin sets a default password only when creating a new staff account** (see Staff accounts below). After that, admin has **no way** to change anyone else's password — there's no "reset password" button anywhere in the admin console. Don't build one.
- **Every staff member changes their own password themselves**, from their own My Account page, by proving their current password first.

Add a "My Account" (or "Profile") link/icon somewhere present on every role's shell — wherever the logged-in user's name currently shows (a header, a sidebar, a settings icon), not just in the admin console's navigation. Waiter, kitchen, and cashier all need to reach this exact same page from their own dashboards.

The page itself, for any role:

- **Profile fields**: full name (required), username (also editable — it's the sign-in identifier but the backend allows changing it; 409 if blank or already taken by someone else, surface that inline), email, contact number, address (all three optional, clearable by saving an empty value). Load current values on mount (`GET /api/staff/me`), edit in a normal form, save via `PATCH /api/staff/me` sending only the fields that changed. If username is changed, show a note that the *next* login must use the new value (the current session stays valid).
- **Change password**: a separate, clearly distinct section/card from the profile form — don't merge them into one save button. Three fields: current password, new password, confirm new password (client-side match check before submitting). Submits to `PATCH /api/staff/me/password`. Wrong current password → inline error on that field, don't wipe the form. Success → a clear confirmation toast/banner.
- Treat this like the account settings page of any normal website — no special restaurant-domain thinking needed here.

---

## The two views

Admin logs in once (`POST /api/auth/login`, same as every other staff role) and lands somewhere that offers two paths:

1. **Management console** — genuinely new UI: staff accounts, menu editor, analytics dashboard, table management (add/retire/reactivate/QR), and an admin-flavored table-overview grid with audit access. This is what most of this prompt describes.
2. **Operate view** — **do not build new screens for this.** Let admin launch directly into the *existing* waiter and cashier pages/components already built, pointed at the same `/api/waiter/**` and `/api/cashier/**`/`/api/bills/**` endpoints. The backend change that makes this possible was a pure authorization grant — an admin's token is already accepted on every waiter and cashier endpoint, attributed correctly as the admin's own account. A simple role/mode switcher (two buttons on a landing screen, or a persistent toggle in a header) that mounts the existing waiter component tree or the existing cashier component tree is the entire scope of this half. If you find yourself writing a new component to replicate something the waiter or cashier screens already do, stop — reuse instead.

Note: admin does **not** get a kitchen-operate mode. That's a deliberate scope decision, not an oversight.

---

## Directory structure

If a `features/tables/` area with `waiter/`/`cashier/` subfolders already exists from the earlier staff table-overview work, add an `admin/` sibling there for the admin-flavored grid/detail view (`AdminTablesPage`, pointed at `/api/admin/tables` and `/api/admin/tables/{tableId}`, reusing the same `TableGrid`/`TableCard`/`useTableOverview` pieces waiter and cashier already use).

Everything else admin-specific (staff management, menu editor, analytics, table management/roster) is new ground — organize it however fits your project's conventions for a "settings"-style section (e.g. `features/admin-console/staff`, `features/admin-console/menu`, `features/admin-console/tables`, `features/admin-console/analytics`).

**My Account is its own thing, outside all of the above** — not role-scoped, so it doesn't belong under `features/admin-console/` any more than under a waiter or cashier folder. Something like `features/account/MyAccountPage.tsx`, linked from a shell/header component common to every role's layout.

---

## The PIN rule (read this before building any create/edit/delete form in the admin console)

**Every admin write action needs the security PIN, with exactly one exception**: toggling a menu item's availability on/off. Every other create, edit, delete, or bulk status-change action — staff, menu categories, menu items (except availability), tables — requires it.

**Batching**: create/delete/bulk-status-change actions (add staff, add menu items, add categories, add tables, delete items, delete categories, retire tables, reactivate tables, activate staff, deactivate staff) all accept a **list**, gated by **one** PIN prompt for the whole batch — this is specifically so bulk work doesn't mean re-entering the PIN over and over. Build every one of these as a "build up a list, then submit once" flow:
- A working area where the admin adds rows (e.g. "+ Add another item" / "+ Add another table" button that appends a blank row to a local list).
- One "Save all" / "Create" button that, when clicked, prompts for the PIN once and submits the whole list in one API call.
- If the call 409s (e.g. a duplicate username within the batch, or a category still holding items), show the error clearly — it names every offending entry, not just the first — and let the admin fix the offending row(s) without losing everything else they'd entered. Nothing is created/deleted until the whole batch is valid (atomic all-or-nothing on the backend).

**Single-item edits** (rename one table, change one staff member's name/role, edit one menu item's price/description) stay one-row forms, but still prompt for the PIN on save — every time, never cached. Reuse one PIN-entry modal component across all of these (you likely already built one for `free-session`/`reveal-participants` in the table-overview work) rather than building a new modal per feature.

---

## Management console pages

### Table overview + audit (`AdminTablesPage` / `AdminTableDetail`)

Same grid component as waiter/cashier, pointed at `/api/admin/tables`. The detail view is the superset — PIN, itemized orders, running subtotal (reuse the waiter detail view's order/item rendering). Two things exist only here:

- A small "View history" affordance per order (`GET /api/admin/orders/{orderId}/history`) showing the status-transition timeline — a simple vertical timeline or table, this is diagnostic, not decorative.
- The two existing PIN-gated actions: **"Reveal phone numbers"** (`reveal-participants` — expands the headcount into the actual participant list, badges whoever `isCreator` is true for) and **"Force free this table"** (`free-session` — visually distinct/warning-styled, a plain-language confirmation *before* the PIN prompt, only shown when the table has an active session). Both re-prompt for the PIN every time, no caching.

### Staff accounts

A list/table (`GET /api/admin/staff`): name, username, role, active status, email/contact/address (read-only here — each staff member's own data, edited only by them via My Account). Give each row a checkbox for multi-select.

- **"Add staff"** — the batch pattern from above: a working list of rows, each with name/username/password/role required and email/contact number/address as optional fields on the same row (collapsible/secondary styling is fine since they're rarely filled in at creation time — most admins will leave these for the new hire to fill in themselves later), "+ Add another," one "Create" button → one PIN prompt → `POST /api/admin/staff` with the whole list. Label the password field as a starting/default password (e.g. helper text: "They can change this themselves after logging in").
- **Edit** (single staff member) — **role only**. A small form/dropdown, PIN prompt → `PATCH /api/admin/staff/{staffId}`. Admin cannot edit a staff member's name, username, or contact details after creation — don't build inputs for those here, they're self-service only via that person's own My Account page.
- **Bulk activate / Bulk deactivate** — select one or more rows via the checkboxes, then a toolbar button for each action → one PIN prompt covering the whole selection → `POST /api/admin/staff/activate` or `/deactivate` with the selected ids. Style deactivated rows visibly differently (greyed out, a badge). The admin's own row should be excluded from selection for deactivate (or show a clear message if they try) — the backend rejects the whole batch if their own id is included, so don't make them discover that by trial and error.
- **No password-reset action anywhere here.** There is no endpoint for it — admin's control over a password ends at account creation. Don't add a button implying otherwise.

### Menu editor

Two related lists: categories (`GET /api/admin/menu/categories`) and items (`GET /api/admin/menu/items`, already carrying `categoryName`). Give both lists row checkboxes for multi-select.

- **"Add categories"** — batch pattern: rows of `{name, sortOrder}`, one PIN prompt, `POST /api/admin/menu/categories`.
- **"Add items"** — batch pattern: rows of `{categoryId (dropdown), name, description, price, imageUrl, available}`, one PIN prompt, `POST /api/admin/menu/items`.
- **Edit** (single category or item) — a form → PIN prompt → `PATCH .../categories/{id}` or `PATCH .../items/{id}`. The item edit form does **not** include an availability toggle — that's handled separately below.
- **Availability toggle** — a quick on/off switch directly on each item row in the list (not inside the edit form), calling `PATCH /api/admin/menu/items/{id}/availability`. **No PIN prompt for this one** — it should feel instant, a single click/tap with no interruption. This is the one deliberate exception to the PIN rule; make the UI reflect that it's a lightweight, low-stakes action (e.g. a simple switch, not a button buried in a confirm dialog).
- **Bulk delete** (categories and items separately) — select rows via checkboxes, a "Delete selected" toolbar button → one PIN prompt → `POST /api/admin/menu/categories/delete` or `/items/delete` with the selected ids. 409s name every blocked entry (a category still holding items, or an item mid-order) — show that list clearly so the admin knows exactly what to fix, and don't lose the rest of the selection state if they want to retry after excluding the blocked ones.

### Table management

Separate from the live overview grid — a roster/settings view (`GET /api/admin/tables/roster`, includes retired tables). Show each table's number, status, retired badge, and a QR code rendered from its `qrToken` (the only place a `qrToken` is ever exposed to staff — this screen doubles as the printable QR reference). Row checkboxes for multi-select.

- **"Add tables"** — batch pattern: rows of `{tableNumber}`, one PIN prompt, `POST /api/admin/tables`, show each new QR code immediately.
- **Rename** (single table) — a form → PIN prompt → `PATCH /api/admin/tables/{tableId}`.
- **Bulk retire / Bulk reactivate** — select rows, toolbar buttons → one PIN prompt covering the selection → `POST /api/admin/tables/retire` or `/reactivate`. If retiring 409s because a selected table has an active session, surface that message directly (it names every blocked table) rather than a generic failure. Retired tables should look visibly "off" (greyed, badge) but stay in this roster view.

### Analytics dashboard

Three widgets, each optionally filterable by a date range (`from`/`to`):

- **Revenue** (`/api/admin/analytics/revenue`) — headline numbers plus a simple chart from `dailyBreakdown`.
- **Top items** (`/api/admin/analytics/top-items`) — a ranked list, no chart needed.
- **Operational timing** (`/api/admin/analytics/timing`) — two headline numbers formatted as human-readable durations ("2m 15s", not raw seconds). Either can be `null` — show a clear "not enough data" state, not "0s" or "NaN".

---

## Responsive design direction

Admin may use this from a phone, a tablet, or a back-office desktop. The table-overview grid/detail panel already have responsive patterns from the earlier staff build — extend them. The management-console pages (staff/menu/analytics/tables) are more naturally desktop/tablet-oriented but shouldn't break at phone width — stack forms, checkboxes-and-toolbar bulk-action bars, and tables vertically rather than assuming a wide viewport.

---

## Explicit "do not build" list

- No kitchen-operate mode for admin.
- No caching or "session unlock" for the PIN — every gated action re-prompts, always, whether single-item or batch.
- No new order/item list UI in the admin table detail view — reuse the waiter detail view's rendering.
- No new generate-bill form for admin's operate-as-cashier mode — that's the existing cashier screen, unchanged.
- No hard-delete UI for staff or tables — both are soft-only (`active`/`retired`), don't build a delete button implying otherwise.
- No "reset password" action anywhere in the admin console.
- No gating My Account behind the admin role — every role needs to reach it from their own screens.
- No PIN prompt on the menu item availability toggle — that's the one deliberate exception, keep it a single click.
- No per-row PIN prompts inside a batch-create flow — one PIN covers the whole list being submitted together, not one per row.
