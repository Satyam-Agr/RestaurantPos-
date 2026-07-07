import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getMenu,
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  submitCart,
  getOrder,
  requestBill,
} from "../lib/api";
import { loadSession, clearSession } from "../lib/session";
import { createStompClient } from "../lib/ws";
import { toast } from "sonner";
import {
  Plus,
  Minus,
  Trash2,
  Send,
  Receipt,
  LogOut,
  ShoppingBag,
  ClipboardList,
  ChefHat,
  Bell,
  CheckCircle2,
  XCircle,
  Loader2,
  X,
  Copy,
  Users,
  UtensilsCrossed,
} from "lucide-react";

const STATUS_COLORS = {
  PENDING: "bg-slate-100 text-slate-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  PREPARING: "bg-amber-100 text-amber-800",
  READY: "bg-emerald-100 text-emerald-800",
  SERVED: "bg-successc/15 text-successc",
  CANCELLED: "bg-red-100 text-red-700 line-through",
};

const STATUS_ICON = {
  PENDING: ClipboardList,
  CONFIRMED: CheckCircle2,
  PREPARING: ChefHat,
  READY: Bell,
  SERVED: CheckCircle2,
  CANCELLED: XCircle,
};

export default function OrderSession() {
  const nav = useNavigate();
  const sess = loadSession();
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState(null);
  const [orders, setOrders] = useState([]); // submitted orders
  const [activeTab, setActiveTab] = useState("menu"); // menu | cart | track
  const [busyId, setBusyId] = useState(null);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [showConfirmBill, setShowConfirmBill] = useState(false);
  const [pinCopied, setPinCopied] = useState(false);
  const cartRef = useRef(null);

  const refreshCart = useCallback(async () => {
    if (!sess?.sessionToken) return;
    try {
      const c = await getCart(sess.sessionToken);
      setCart(c);
    } catch (e) {
      toast.error(e.message);
    }
  }, [sess?.sessionToken]);

  const refreshOrders = useCallback(async () => {
    // We track order ids we've seen
    const ids = ordersIdsRef.current;
    if (ids.size === 0) return;
    try {
      const fresh = await Promise.all([...ids].map((id) => getOrder(id).catch(() => null)));
      setOrders(fresh.filter(Boolean).sort((a, b) => b.id - a.id));
    } catch (e) {
      /* handled in interceptor */
    }
  }, []);

  const ordersIdsRef = useRef(new Set());

  // Initial load: session guard + menu + cart
  useEffect(() => {
    if (!sess?.sessionToken) {
      nav("/");
      return;
    }
    getMenu()
      .then(setMenu)
      .catch((e) => toast.error(e.message));
    refreshCart();
  }, [nav, sess?.sessionToken, refreshCart]);

  // WebSocket subscriptions with REST reconciliation on connect / visibility / online
  useEffect(() => {
    if (!sess?.sessionId) return;

    const reconcile = () => {
      refreshCart();
      refreshOrders();
    };

    const { deactivate } = createStompClient({
      subscriptions: [
        {
          topic: `/topic/cart/${sess.sessionId}`,
          handler: (payload) => {
            if (!payload) return;
            if (payload.status === "CART") {
              setCart(payload);
              cartRef.current?.classList?.remove("animate-pop");
              // trigger reflow to restart animation
              void cartRef.current?.offsetWidth;
              cartRef.current?.classList?.add("animate-pop");
            } else {
              // submitted order broadcast
              ordersIdsRef.current.add(payload.id);
              setOrders((prev) => {
                const others = prev.filter((o) => o.id !== payload.id);
                return [payload, ...others].sort((a, b) => b.id - a.id);
              });
            }
          },
        },
        {
          topic: `/topic/table/${sess.sessionId}`,
          handler: (payload) => {
            if (!payload) return;
            ordersIdsRef.current.add(payload.id);
            setOrders((prev) => {
              const others = prev.filter((o) => o.id !== payload.id);
              return [payload, ...others].sort((a, b) => b.id - a.id);
            });
            if (payload.status === "READY") {
              toast.success("An item is ready!");
            }
          },
        },
      ],
      onConnect: reconcile,
    });

    const onVisible = () => document.visibilityState === "visible" && reconcile();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", reconcile);

    return () => {
      deactivate();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", reconcile);
    };
  }, [sess?.sessionId, refreshCart, refreshOrders]);

  if (!sess) return null;

  const cartCount = cart?.items?.reduce((s, i) => s + (i.quantity || 0), 0) || 0;
  const cartTotal = cart?.items?.reduce((s, i) => s + (i.price || 0) * (i.quantity || 0), 0) || 0;

  const handleAdd = async (menuItemId) => {
    setBusyId(`add-${menuItemId}`);
    try {
      const updated = await addCartItem(sess.sessionToken, { menuItemId, quantity: 1 });
      setCart(updated);
      toast.success("Added to cart");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleQty = async (item, delta) => {
    const newQty = (item.quantity || 0) + delta;
    setBusyId(`qty-${item.id}`);
    try {
      if (newQty <= 0) {
        const c = await removeCartItem(sess.sessionToken, item.id);
        setCart(c);
      } else {
        const c = await updateCartItem(sess.sessionToken, item.id, { quantity: newQty });
        setCart(c);
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleNotes = async (item, notes) => {
    try {
      const c = await updateCartItem(sess.sessionToken, item.id, { notes });
      setCart(c);
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleRemove = async (item) => {
    setBusyId(`rm-${item.id}`);
    try {
      const c = await removeCartItem(sess.sessionToken, item.id);
      setCart(c);
      toast.success("Removed");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleSubmit = async () => {
    if (!cart?.items?.length) return;
    setSubmitBusy(true);
    try {
      const placed = await submitCart(sess.sessionToken);
      ordersIdsRef.current.add(placed.id);
      setOrders((prev) => [placed, ...prev.filter((o) => o.id !== placed.id)]);
      toast.success(`Order #${placed.id} placed!`);
      await refreshCart();
      setActiveTab("track");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSubmitBusy(false);
    }
  };

  const handleRequestBill = async () => {
    try {
      await requestBill(sess.sessionToken);
      toast.success("Bill requested. The cashier will bring it shortly.");
      setShowConfirmBill(false);
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleLeave = () => {
    clearSession();
    nav("/");
  };

  const copyPin = () => {
    navigator.clipboard?.writeText(sess.pin);
    setPinCopied(true);
    setTimeout(() => setPinCopied(false), 1500);
  };

  return (
    <div className="min-h-screen bg-bg pb-32">
      {/* Sticky header with PIN badge */}
      <header className="sticky top-0 z-40 glass border-b border-white/40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-ink2 font-semibold">
              Table {sess.tableNumber}
            </div>
            <div className="font-heading text-lg font-semibold">Your shared order</div>
          </div>
          <button
            onClick={copyPin}
            data-testid="pin-badge"
            className="group flex items-center gap-2 bg-brand/10 hover:bg-brand/15 border border-brand/20 rounded-2xl px-3 py-2 transition"
            title="Tap to copy PIN"
          >
            <Users size={14} className="text-brand" />
            <div className="text-left">
              <div className="text-[9px] uppercase tracking-widest text-brand/80 font-semibold">
                PIN
              </div>
              <div className="font-mono font-bold tracking-[0.3em] text-brand text-sm">
                {sess.pin}
              </div>
            </div>
            {pinCopied ? (
              <CheckCircle2 size={14} className="text-successc" />
            ) : (
              <Copy size={12} className="text-brand/60 group-hover:text-brand" />
            )}
          </button>
          <button
            onClick={handleLeave}
            data-testid="leave-btn"
            className="text-ink2 hover:text-destructive p-2 rounded-full hover:bg-destructive/10 transition"
            title="Leave session"
          >
            <LogOut size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-3xl mx-auto px-4 pb-2 flex gap-1">
          {[
            { id: "menu", label: "Menu", icon: ShoppingBag },
            { id: "cart", label: `Cart (${cartCount})`, icon: ClipboardList },
            { id: "track", label: `Orders (${orders.length})`, icon: ChefHat },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                data-testid={`tab-${t.id}`}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all ${
                  activeTab === t.id
                    ? "bg-brand text-white shadow-soft"
                    : "text-ink2 hover:bg-bg2/60"
                }`}
              >
                <Icon size={14} />
                {t.label}
              </button>
            );
          })}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-6">
        {activeTab === "menu" && <MenuView menu={menu} onAdd={handleAdd} busyId={busyId} />}
        {activeTab === "cart" && (
          <CartView
            cartRef={cartRef}
            cart={cart}
            onQty={handleQty}
            onNotes={handleNotes}
            onRemove={handleRemove}
            busyId={busyId}
          />
        )}
        {activeTab === "track" && <OrdersView orders={orders} />}
      </main>

      {/* Sticky footer actions */}
      {activeTab === "cart" && cart?.items?.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 glass border-t border-white/40">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-ink2">Total</div>
              <div className="font-heading text-xl font-semibold">₹{cartTotal.toFixed(2)}</div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitBusy}
              data-testid="submit-order-btn"
              className="flex-1 flex items-center justify-center gap-2 rounded-full bg-brand hover:bg-brandHover text-white font-medium py-3 shadow-lift hover:-translate-y-0.5 transition-all disabled:opacity-50"
            >
              {submitBusy ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
              Submit Order
            </button>
          </div>
        </div>
      )}

      {activeTab === "track" && orders.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 glass border-t border-white/40">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <button
              onClick={() => setShowConfirmBill(true)}
              data-testid="request-bill-btn"
              className="w-full flex items-center justify-center gap-2 rounded-full bg-ink hover:bg-black text-white font-medium py-3 shadow-lift hover:-translate-y-0.5 transition-all"
            >
              <Receipt size={16} />
              Request Bill
            </button>
          </div>
        </div>
      )}

      {/* Confirm bill modal */}
      {showConfirmBill && (
        <Modal onClose={() => setShowConfirmBill(false)} title="Request the bill?">
          <p className="text-ink2 mb-6">
            All items must be served before the bill can be generated. Continue?
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowConfirmBill(false)}
              className="flex-1 rounded-full border border-bg2 py-2.5 hover:bg-bg2/60 transition"
              data-testid="cancel-bill-btn"
            >
              Cancel
            </button>
            <button
              onClick={handleRequestBill}
              data-testid="confirm-bill-btn"
              className="flex-1 rounded-full bg-brand hover:bg-brandHover text-white py-2.5 transition"
            >
              Yes, request bill
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ---------- Sub-components ----------

function MenuView({ menu, onAdd, busyId }) {
  if (!menu.length) {
    return <EmptyState icon={ShoppingBag} title="Loading menu…" />;
  }
  return (
    <div className="space-y-10">
      {menu.map((cat) => (
        <section key={cat.id} className="animate-fadeUp">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="font-heading text-2xl font-semibold tracking-tight">{cat.name}</h2>
            <div className="flex-1 h-px bg-bg2" />
            <span className="text-xs text-ink2">{cat.items?.length || 0} items</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {cat.items?.map((it) => (
              <MenuItemCard key={it.id} item={it} onAdd={onAdd} busyId={busyId} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function MenuItemCard({ item, onAdd, busyId }) {
  const isAdding = busyId === `add-${item.id}`;
  const hasImage = !!item.imageUrl;
  return (
    <div
      data-testid={`menu-item-${item.id}`}
      className={`group bg-surface border border-bg2 rounded-2xl overflow-hidden hover:shadow-lift hover:-translate-y-0.5 transition-all ${
        !item.available ? "opacity-70" : ""
      }`}
    >
      <div className="relative aspect-[16/10] bg-gradient-to-br from-bg2 to-bg overflow-hidden">
        {hasImage ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              e.target.style.display = "none";
              e.target.nextSibling.style.display = "flex";
            }}
          />
        ) : null}
        <div
          className={`absolute inset-0 flex items-center justify-center text-brand/40 ${
            hasImage ? "hidden" : "flex"
          }`}
        >
          <UtensilsCrossed size={40} strokeWidth={1.2} />
        </div>
        {!item.available && (
          <div className="absolute top-2 left-2 text-[10px] uppercase tracking-wider bg-destructive text-white px-2 py-0.5 rounded-full font-semibold shadow-soft">
            Unavailable
          </div>
        )}
        <button
          onClick={() => onAdd(item.id)}
          disabled={!item.available || isAdding}
          data-testid={`add-to-cart-btn-${item.id}`}
          className="absolute bottom-3 right-3 h-10 w-10 grid place-items-center rounded-full bg-brand hover:bg-brandHover text-white shadow-lift disabled:opacity-40 disabled:cursor-not-allowed transition-all group-hover:scale-110"
        >
          {isAdding ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Plus size={18} strokeWidth={2.5} />
          )}
        </button>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="font-heading font-medium text-ink truncate">{item.name}</div>
            {item.description && (
              <div className="text-sm text-ink2 mt-1 line-clamp-2 leading-snug">
                {item.description}
              </div>
            )}
          </div>
          <div className="font-heading font-semibold text-brand shrink-0 tabular-nums">
            ₹{Number(item.price).toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}

function CartView({ cartRef, cart, onQty, onNotes, onRemove, busyId }) {
  const items = cart?.items || [];
  if (!items.length) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Your cart is empty"
        subtitle="Add items from the menu — teammates at your table see them instantly."
      />
    );
  }
  return (
    <div ref={cartRef} className="space-y-3">
      {items.map((it) => (
        <div
          key={it.id}
          data-testid={`cart-item-${it.id}`}
          className="bg-surface border border-bg2 rounded-2xl p-4 animate-fadeUp"
        >
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-ink">{it.menuItemName || it.name}</span>
                <span className="text-xs text-ink2">₹{Number(it.price).toFixed(2)}</span>
              </div>
              <NotesEditor
                initial={it.notes || ""}
                onSave={(n) => onNotes(it, n)}
                testId={`notes-${it.id}`}
              />
            </div>
            <div className="flex items-center gap-1 bg-bg rounded-full px-1 py-1">
              <button
                onClick={() => onQty(it, -1)}
                disabled={busyId === `qty-${it.id}`}
                data-testid={`decrement-${it.id}`}
                className="h-8 w-8 grid place-items-center rounded-full hover:bg-bg2 transition"
              >
                <Minus size={14} />
              </button>
              <span className="w-6 text-center font-mono font-semibold" data-testid={`qty-${it.id}`}>
                {it.quantity}
              </span>
              <button
                onClick={() => onQty(it, +1)}
                disabled={busyId === `qty-${it.id}`}
                data-testid={`increment-${it.id}`}
                className="h-8 w-8 grid place-items-center rounded-full hover:bg-bg2 transition"
              >
                <Plus size={14} />
              </button>
            </div>
            <button
              onClick={() => onRemove(it)}
              disabled={busyId === `rm-${it.id}`}
              data-testid={`remove-item-${it.id}`}
              className="text-ink2 hover:text-destructive p-1.5 rounded-full hover:bg-destructive/10 transition"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function NotesEditor({ initial, onSave, testId }) {
  const [v, setV] = useState(initial);
  const [editing, setEditing] = useState(false);

  if (!editing && !v) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-xs text-brand mt-1 hover:underline"
        data-testid={`${testId}-open`}
      >
        + Add note
      </button>
    );
  }

  return editing ? (
    <div className="mt-2 flex gap-2">
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        autoFocus
        placeholder="e.g. extra spicy, no onions"
        data-testid={testId}
        className="flex-1 text-sm bg-bg border border-bg2 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-brand"
      />
      <button
        onClick={() => {
          onSave(v);
          setEditing(false);
        }}
        data-testid={`${testId}-save`}
        className="text-xs bg-brand text-white rounded-lg px-3 py-1"
      >
        Save
      </button>
    </div>
  ) : (
    <button
      onClick={() => setEditing(true)}
      className="text-xs text-ink2 mt-1 italic hover:text-brand"
      data-testid={`${testId}-edit`}
    >
      &ldquo;{v}&rdquo;
    </button>
  );
}

function OrdersView({ orders }) {
  if (!orders.length) {
    return (
      <EmptyState
        icon={ChefHat}
        title="No orders yet"
        subtitle="When you submit your cart, it'll appear here with live status updates."
      />
    );
  }
  return (
    <div className="space-y-4">
      {orders.map((o) => (
        <div key={o.id} className="bg-surface border border-bg2 rounded-2xl p-4 animate-fadeUp">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-ink2 font-semibold">
                Order #{o.id}
              </div>
              <div className="font-heading font-semibold">{o.status}</div>
            </div>
            {o.placedAt && (
              <div className="text-xs text-ink2">
                {new Date(o.placedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            )}
          </div>
          <div className="space-y-2">
            {o.items?.map((it) => {
              const Icon = STATUS_ICON[it.itemStatus] || ClipboardList;
              const cancelled = it.itemStatus === "CANCELLED";
              return (
                <div
                  key={it.id}
                  className={`flex items-center justify-between text-sm ${
                    cancelled ? "opacity-70" : ""
                  }`}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-ink ${cancelled ? "line-through" : ""}`}
                    >
                      {it.quantity}× {it.menuItemName || it.name}
                    </span>
                    {it.notes && !cancelled && (
                      <span className="text-xs text-ink2 italic">— {it.notes}</span>
                    )}
                    {cancelled && (
                      <span className="text-[10px] uppercase tracking-wider bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-semibold">
                        removed by staff
                      </span>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                      STATUS_COLORS[it.itemStatus] || "bg-slate-100 text-slate-700"
                    }`}
                  >
                    <Icon size={10} />
                    {it.itemStatus}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="text-center py-16 animate-fadeUp">
      <div className="inline-grid place-items-center h-14 w-14 rounded-full bg-brand/10 text-brand mb-4">
        <Icon size={24} />
      </div>
      <h3 className="font-heading text-xl font-semibold">{title}</h3>
      {subtitle && <p className="text-ink2 mt-2 max-w-sm mx-auto">{subtitle}</p>}
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center p-4 animate-fadeUp">
      <div className="bg-surface rounded-3xl max-w-md w-full p-6 shadow-lift">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-xl font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="text-ink2 hover:text-ink p-1 rounded-full hover:bg-bg2 transition"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
