import React, { useCallback, useEffect, useState } from "react";
import StaffShell from "../components/StaffShell";
import {
  waiterPending,
  waiterReady,
  waiterConfirm,
  waiterServeItem,
  waiterRemoveItem,
  waiterUpdateItem,
} from "../lib/api";
import { createStompClient } from "../lib/ws";
import { toast } from "sonner";
import {
  CheckCircle2,
  ClipboardList,
  Bell,
  Loader2,
  Trash2,
  Plus,
  Minus,
  RefreshCw,
} from "lucide-react";

export default function WaiterDashboard() {
  const [pending, setPending] = useState([]);
  const [ready, setReady] = useState([]);
  const [busy, setBusy] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [p, r] = await Promise.all([waiterPending(), waiterReady()]);
      setPending(p);
      setReady(r);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const { deactivate } = createStompClient({
      subscriptions: [
        {
          topic: "/topic/waiter",
          handler: () => refresh(),
        },
      ],
      onConnect: refresh,
    });
    const onVis = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", refresh);
    return () => {
      deactivate();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", refresh);
    };
  }, [refresh]);

  const confirm = async (orderId) => {
    setBusy(`c-${orderId}`);
    try {
      await waiterConfirm(orderId);
      toast.success(`Order #${orderId} confirmed`);
      refresh();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  };

  const serveItem = async (itemId) => {
    setBusy(`s-${itemId}`);
    try {
      await waiterServeItem(itemId);
      toast.success("Item served");
      refresh();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  };

  const removeItem = async (orderId, itemId) => {
    setBusy(`r-${itemId}`);
    try {
      await waiterRemoveItem(orderId, itemId);
      toast.success("Item removed");
      refresh();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  };

  const changeQty = async (orderId, item, delta) => {
    const newQty = (item.quantity || 0) + delta;
    if (newQty <= 0) return removeItem(orderId, item.id);
    setBusy(`q-${item.id}`);
    try {
      await waiterUpdateItem(orderId, item.id, { quantity: newQty });
      refresh();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <StaffShell title="Waiter Dashboard" subtitle="WAITER" testId="waiter-dashboard">
      <div className="flex items-center justify-between mb-4">
        <p className="text-ink2">
          {pending.length} pending · {ready.length} ready to serve
        </p>
        <button
          onClick={refresh}
          disabled={refreshing}
          data-testid="waiter-refresh-btn"
          className="text-sm text-ink2 hover:text-brand flex items-center gap-1.5 transition"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending */}
        <Column
          title="Pending"
          count={pending.length}
          Icon={ClipboardList}
          color="bg-blue-100 text-blue-700"
          empty="No pending orders — well done!"
        >
          {pending.map((o) => (
            <div
              key={o.id}
              data-testid={`pending-order-${o.id}`}
              className="bg-surface border border-bg2 rounded-2xl p-4 animate-fadeUp"
            >
              <OrderHeader order={o} />
              <ItemList
                items={o.items}
                actions={(it) => (
                  <div className="flex items-center gap-1">
                    <div className="flex items-center gap-0.5 bg-bg rounded-full px-1 py-0.5">
                      <button
                        onClick={() => changeQty(o.id, it, -1)}
                        disabled={busy === `q-${it.id}`}
                        data-testid={`w-dec-${it.id}`}
                        className="h-6 w-6 grid place-items-center rounded-full hover:bg-bg2"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-5 text-center text-xs font-mono">{it.quantity}</span>
                      <button
                        onClick={() => changeQty(o.id, it, +1)}
                        disabled={busy === `q-${it.id}`}
                        data-testid={`w-inc-${it.id}`}
                        className="h-6 w-6 grid place-items-center rounded-full hover:bg-bg2"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    <button
                      onClick={() => removeItem(o.id, it.id)}
                      disabled={busy === `r-${it.id}`}
                      data-testid={`w-remove-${it.id}`}
                      className="h-6 w-6 grid place-items-center rounded-full text-ink2 hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              />
              <button
                onClick={() => confirm(o.id)}
                disabled={busy === `c-${o.id}`}
                data-testid={`confirm-order-${o.id}`}
                className="mt-3 w-full flex items-center justify-center gap-2 rounded-full bg-brand hover:bg-brandHover text-white font-medium py-2.5 transition-all disabled:opacity-50"
              >
                {busy === `c-${o.id}` ? (
                  <Loader2 className="animate-spin" size={14} />
                ) : (
                  <CheckCircle2 size={14} />
                )}
                Confirm Order
              </button>
            </div>
          ))}
        </Column>

        {/* Ready to serve */}
        <Column
          title="Ready to Serve"
          count={ready.length}
          Icon={Bell}
          color="bg-emerald-100 text-emerald-800"
          empty="Nothing ready yet."
        >
          {ready.map((o) => (
            <div
              key={o.id}
              data-testid={`ready-order-${o.id}`}
              className="bg-surface border border-bg2 rounded-2xl p-4 animate-fadeUp"
            >
              <OrderHeader order={o} />
              <ItemList
                items={o.items}
                actions={(it) =>
                  it.itemStatus === "READY" ? (
                    <button
                      onClick={() => serveItem(it.id)}
                      disabled={busy === `s-${it.id}`}
                      data-testid={`serve-item-${it.id}`}
                      className="text-xs bg-successc hover:opacity-90 text-white rounded-full px-3 py-1 flex items-center gap-1 disabled:opacity-50"
                    >
                      {busy === `s-${it.id}` ? (
                        <Loader2 className="animate-spin" size={10} />
                      ) : (
                        <CheckCircle2 size={10} />
                      )}
                      Serve
                    </button>
                  ) : null
                }
              />
            </div>
          ))}
        </Column>
      </div>
    </StaffShell>
  );
}

function Column({ title, count, Icon, color, empty, children }) {
  const items = React.Children.toArray(children);
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <div className={`h-7 w-7 grid place-items-center rounded-full ${color}`}>
          <Icon size={13} />
        </div>
        <h2 className="font-heading text-xl font-semibold">{title}</h2>
        <span className="text-xs text-ink2 font-mono">({count})</span>
      </div>
      <div className="space-y-3">
        {items.length ? (
          items
        ) : (
          <div className="text-center py-10 text-ink2 border border-dashed border-bg2 rounded-2xl">
            {empty}
          </div>
        )}
      </div>
    </section>
  );
}

function OrderHeader({ order }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div>
        <div className="text-[10px] uppercase tracking-widest text-ink2 font-semibold">
          Table {order.tableNumber} · Order #{order.id}
        </div>
        <div className="font-heading font-semibold">{order.status}</div>
      </div>
      {order.placedAt && (
        <div className="text-xs text-ink2">
          {new Date(order.placedAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      )}
    </div>
  );
}

function ItemList({ items, actions }) {
  return (
    <div className="space-y-1.5">
      {items?.map((it) => (
        <div
          key={it.id}
          className={`flex items-center justify-between text-sm py-1 ${
            it.itemStatus === "CANCELLED" ? "opacity-50" : ""
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`text-ink font-medium ${
                it.itemStatus === "CANCELLED" ? "line-through" : ""
              }`}
            >
              {it.quantity}× {it.menuItemName || it.name}
            </span>
            {it.notes && (
              <span className="text-xs text-ink2 italic truncate">— {it.notes}</span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${
                itemColor(it.itemStatus)
              }`}
            >
              {it.itemStatus}
            </span>
            {actions?.(it)}
          </div>
        </div>
      ))}
    </div>
  );
}

function itemColor(s) {
  return (
    {
      PENDING: "bg-slate-100 text-slate-700",
      CONFIRMED: "bg-blue-100 text-blue-700",
      PREPARING: "bg-amber-100 text-amber-800",
      READY: "bg-emerald-100 text-emerald-800",
      SERVED: "bg-successc/15 text-successc",
      CANCELLED: "bg-red-100 text-red-700",
    }[s] || "bg-slate-100 text-slate-700"
  );
}
