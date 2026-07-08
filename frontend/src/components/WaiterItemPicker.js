import React, { useEffect, useMemo, useState } from "react";
import { getMenu, waiterPlaceOrder } from "../lib/api";
import { toast } from "sonner";
import {
  X,
  Search,
  Plus,
  Minus,
  Trash2,
  Send,
  Loader2,
  ShoppingBag,
} from "lucide-react";

/**
 * Compact, tap-fast menu picker for waiters.
 *
 * Left: menu (categories → items, tap "+" to add / bump quantity).
 * Right: local order draft with qty +/- and inline notes editor.
 *
 * On "Place Order", posts to POST /api/waiter/tables/{tableId}/orders
 *   → order comes back as CONFIRMED (immediately visible to kitchen).
 */
export default function WaiterItemPicker({ tableId, tableNumber, onClose, onPlaced }) {
  const [menu, setMenu] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  // draft: Map<menuItemId, { menuItemId, menuItemName, unitPrice, quantity, notes }>
  const [draft, setDraft] = useState({});

  useEffect(() => {
    getMenu()
      .then((m) => setMenu(Array.isArray(m) ? m : []))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoadingMenu(false));
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return menu;
    const q = query.toLowerCase();
    return menu
      .map((cat) => ({
        ...cat,
        items: (cat.items || []).filter((it) => it.name?.toLowerCase().includes(q)),
      }))
      .filter((c) => c.items.length > 0);
  }, [menu, query]);

  const addItem = (item) => {
    setDraft((prev) => {
      const cur = prev[item.id];
      return {
        ...prev,
        [item.id]: {
          menuItemId: item.id,
          menuItemName: item.name,
          unitPrice: item.price,
          quantity: (cur?.quantity || 0) + 1,
          notes: cur?.notes || "",
        },
      };
    });
  };

  const setQty = (menuItemId, qty) => {
    setDraft((prev) => {
      if (qty <= 0) {
        const { [menuItemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [menuItemId]: { ...prev[menuItemId], quantity: qty } };
    });
  };

  const setNotes = (menuItemId, notes) => {
    setDraft((prev) => ({
      ...prev,
      [menuItemId]: { ...prev[menuItemId], notes },
    }));
  };

  const removeItem = (menuItemId) => setQty(menuItemId, 0);

  const draftList = Object.values(draft);
  const draftCount = draftList.reduce((s, i) => s + i.quantity, 0);
  const draftTotal = draftList.reduce((s, i) => s + i.quantity * (i.unitPrice || 0), 0);

  const handlePlace = async () => {
    if (draftList.length === 0) return;
    setBusy(true);
    try {
      const payload = draftList.map((it) => ({
        menuItemId: it.menuItemId,
        quantity: it.quantity,
        notes: it.notes || undefined,
      }));
      const order = await waiterPlaceOrder(tableId, payload);
      toast.success(`Order placed — ${draftCount} item(s) sent to kitchen`);
      onPlaced?.(order);
    } catch (e) {
      const msg = e.message || "Failed to place order";
      if (e.status === 404) {
        toast.error("This table has no active order list — start one first.");
      } else if (e.status === 409) {
        toast.error(msg);
      } else {
        toast.error(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        data-testid="waiter-item-picker"
        className="bg-surface rounded-2xl sm:rounded-3xl w-full max-w-4xl max-h-[92vh] shadow-lift animate-fadeUp flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-bg2">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-ink2 font-semibold">
              New Order · Table {tableNumber}
            </div>
            <div className="font-heading text-lg font-semibold">Pick items</div>
          </div>
          <button
            onClick={onClose}
            data-testid="picker-close"
            className="text-ink2 hover:text-ink p-1.5 rounded-full hover:bg-bg2"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-2 border-b border-bg2">
          <div className="flex items-center gap-2 bg-bg border border-bg2 rounded-xl px-3 py-2">
            <Search size={14} className="text-ink2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search dishes…"
              data-testid="picker-search"
              className="flex-1 bg-transparent outline-none text-sm"
            />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-0 overflow-hidden">
          {/* Menu */}
          <div className="overflow-y-auto px-5 py-3 border-b md:border-b-0 md:border-r border-bg2">
            {loadingMenu ? (
              <div className="grid place-items-center py-10">
                <Loader2 className="animate-spin text-brand" size={20} />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center text-ink2 italic py-10 text-sm">
                No dishes match "{query}"
              </div>
            ) : (
              filtered.map((cat) => (
                <section key={cat.id} className="mb-4">
                  <div className="flex items-center gap-2 mb-1.5 text-[10px] uppercase tracking-widest text-ink2 font-semibold">
                    <span>{cat.name}</span>
                    <div className="flex-1 h-px bg-bg2" />
                  </div>
                  {cat.items?.map((it) => {
                    const cur = draft[it.id]?.quantity || 0;
                    const disabled = !it.available;
                    return (
                      <button
                        key={it.id}
                        onClick={() => !disabled && addItem(it)}
                        disabled={disabled}
                        data-testid={`picker-item-${it.id}`}
                        className={`w-full flex items-center justify-between gap-2 rounded-xl px-2.5 py-1.5 text-left transition ${
                          disabled
                            ? "opacity-40 cursor-not-allowed"
                            : "hover:bg-bg"
                        } ${cur > 0 ? "bg-brand/10" : ""}`}
                      >
                        <span className="flex-1 truncate text-sm text-ink">
                          {it.name}
                        </span>
                        <span className="text-xs text-ink2 shrink-0 font-mono">
                          ₹{Number(it.price).toFixed(0)}
                        </span>
                        {cur > 0 && (
                          <span className="shrink-0 min-w-[22px] text-center text-xs font-mono font-bold text-brand bg-white rounded-full px-1.5 py-0.5">
                            ×{cur}
                          </span>
                        )}
                        <Plus
                          size={14}
                          className={disabled ? "text-ink2" : "text-brand"}
                        />
                      </button>
                    );
                  })}
                </section>
              ))
            )}
          </div>

          {/* Draft */}
          <div className="overflow-y-auto px-5 py-3">
            <div className="text-[10px] uppercase tracking-widest text-ink2 font-semibold mb-2">
              Order draft · {draftCount} item{draftCount === 1 ? "" : "s"}
            </div>

            {draftList.length === 0 ? (
              <div className="text-center text-ink2 py-10 text-sm border border-dashed border-bg2 rounded-2xl">
                <ShoppingBag className="mx-auto mb-2 text-brand" size={22} />
                Tap a dish on the left to build the order.
              </div>
            ) : (
              <div className="space-y-2">
                {draftList.map((it) => (
                  <div
                    key={it.menuItemId}
                    data-testid={`picker-draft-${it.menuItemId}`}
                    className="bg-bg border border-bg2 rounded-xl p-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-ink truncate">
                          {it.menuItemName}
                        </div>
                        <div className="text-xs text-ink2 font-mono">
                          ₹{Number(it.unitPrice || 0).toFixed(2)}
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 bg-surface rounded-full px-1 py-0.5 border border-bg2">
                        <button
                          onClick={() => setQty(it.menuItemId, it.quantity - 1)}
                          disabled={it.quantity <= 1}
                          data-testid={`picker-dec-${it.menuItemId}`}
                          className="h-6 w-6 grid place-items-center rounded-full hover:bg-bg disabled:opacity-30"
                        >
                          <Minus size={11} />
                        </button>
                        <span className="w-5 text-center text-xs font-mono font-bold">
                          {it.quantity}
                        </span>
                        <button
                          onClick={() => setQty(it.menuItemId, it.quantity + 1)}
                          data-testid={`picker-inc-${it.menuItemId}`}
                          className="h-6 w-6 grid place-items-center rounded-full hover:bg-bg"
                        >
                          <Plus size={11} />
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(it.menuItemId)}
                        data-testid={`picker-remove-${it.menuItemId}`}
                        className="h-6 w-6 grid place-items-center rounded-full text-ink2 hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                    <input
                      value={it.notes}
                      onChange={(e) => setNotes(it.menuItemId, e.target.value)}
                      placeholder="Notes (e.g. no onions)"
                      data-testid={`picker-notes-${it.menuItemId}`}
                      className="mt-2 w-full text-xs bg-white border border-bg2 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-bg2 px-5 py-3 flex items-center gap-3">
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-widest text-ink2 font-semibold">
              Est. Total
            </div>
            <div className="font-heading text-xl font-bold">
              ₹{draftTotal.toFixed(2)}
            </div>
          </div>
          <button
            onClick={handlePlace}
            disabled={busy || draftList.length === 0}
            data-testid="picker-place-btn"
            className="flex items-center gap-2 rounded-full bg-brand hover:bg-brandHover text-white font-medium px-5 py-2.5 shadow-lift transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
            Place Order
          </button>
        </div>
      </div>
    </div>
  );
}
