# Admin backlog — ideas, not built

These came up while designing the admin console but were deliberately left out of the current build. Nothing here has any code behind it yet — just a record of the idea and roughly what it'd take, for whenever it's worth doing.

## Operational config UI

Right now a couple of operational toggles only exist as backend config, editable only by touching `application.yml` and restarting the server — e.g. `app.billing.free-table-on-generate` (whether a table frees at bill-generation time or payment time).

The idea: move settings like this into a DB-backed config table instead of `application.yml`, with an admin screen to flip them live, no restart needed. Worth doing once there are enough of these toggles that "edit a YAML file and redeploy" stops being acceptable — for just the one flag that exists today, it's not worth the plumbing (a new entity, a settings repository, a cache-invalidation story so the running app actually picks up a change without restarting).

## Discount / promo presets

Right now the cashier types a raw discount amount into `GenerateBillRequest.discount` every time — there's no concept of a named/reusable discount ("Happy Hour 10%", "Staff Meal", "Manager Comp").

The idea: a small `DiscountPreset` entity (name, type — percentage or flat amount, value), managed by admin, offered as a dropdown in the cashier's generate-bill screen instead of (or alongside) the free-text field. Worth doing once discounting becomes routine enough that cashiers are re-typing the same values repeatedly, or once there's a need to report on *why* revenue was discounted (which preset was used, how often). For occasional one-off discounts, today's free-text field is simpler and doesn't need a management screen behind it.

## Menu engineering / profitability matrix

The classic restaurant-industry "Stars / Plowhorses / Puzzles / Dogs" quadrant — plotting each menu item's popularity (units sold) against its profitability (contribution margin), so the admin can see at a glance which items to promote, reprice, or drop. Almost no small-restaurant POS surfaces this even though it's a well-established technique.

Blocked on `MenuItem` having no cost basis today — only `price` exists, no `cost`. The idea: add a nullable `cost` field to `MenuItem` (admin-entered, optional — items without a cost just don't participate in the matrix), then a new analytics endpoint that joins `BillLineItem` sales data against current item price/cost to compute contribution margin per item and bucket them into the four quadrants. Deferred until you're ready to commit to keeping food-cost data up to date — the feature is only as good as the cost data behind it, and stale costs would make the matrix actively misleading rather than just incomplete.
