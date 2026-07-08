import React from "react";
import { Loader2, CheckCircle2, Bell } from "lucide-react";

const ITEM_STATUS_TONE = {
  PENDING: "bg-slate-100 text-slate-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  PREPARING: "bg-amber-100 text-amber-800",
  READY: "bg-emerald-100 text-emerald-800",
  SERVED: "bg-successc/15 text-successc",
  CANCELLED: "bg-red-100 text-red-700",
};

const ORDER_TONE = {
  PLACED: "bg-blue-100 text-blue-700",
  CONFIRMED: "bg-amber-100 text-amber-800",
  PREPARING: "bg-amber-100 text-amber-800",
  READY: "bg-emerald-100 text-emerald-800",
  SERVED: "bg-successc/15 text-successc",
  BILL_REQUESTED: "bg-yellow-100 text-yellow-800",
};

/**
 * Shared order list renderer used by both WaiterTableDetail and CashierTableDetail.
 *
 * Props:
 *   - orders: OrderResponse[]
 *   - onConfirmOrder?(orderId)          — waiter action; hidden for cashier
 *   - onServeItem?(itemId)              — waiter action; hidden for cashier
 *   - busy: string | null               — busy key, e.g. `c-${orderId}` or `s-${itemId}`
 */
export default function OrderList({ orders, onConfirmOrder, onServeItem, busy }) {
  if (!orders || orders.length === 0) {
    return (
      <div className="text-center text-ink2 py-6 border border-dashed border-bg2 rounded-2xl">
        No submitted orders yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((o) => (
        <div key={o.id} className="bg-bg rounded-2xl p-3 border border-bg2">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] uppercase tracking-widest text-ink2 font-semibold">
              Order #{o.id}
              {o.placedAt && (
                <span className="ml-2 text-ink2/60 normal-case font-mono">
                  {new Date(o.placedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
            <span
              className={`text-[9px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-full ${
                ORDER_TONE[o.status] || "bg-slate-100 text-slate-700"
              }`}
            >
              {o.status}
            </span>
          </div>
          <div className="space-y-1.5">
            {o.items?.map((it) => (
              <div
                key={it.id}
                className={`flex items-center justify-between text-sm ${
                  it.itemStatus === "CANCELLED" ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={
                      it.itemStatus === "CANCELLED" ? "line-through" : "text-ink"
                    }
                  >
                    {it.quantity}× {it.menuItemName}
                  </span>
                  {it.notes && (
                    <span className="text-xs text-ink2 italic truncate">
                      — {it.notes}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${
                      ITEM_STATUS_TONE[it.itemStatus] || "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {it.itemStatus}
                  </span>
                  {onServeItem && it.itemStatus === "READY" && (
                    <button
                      onClick={() => onServeItem(it.id)}
                      disabled={busy === `s-${it.id}`}
                      data-testid={`serve-item-${it.id}`}
                      className="text-[10px] bg-successc hover:opacity-90 text-white rounded-full px-2 py-0.5 flex items-center gap-1 disabled:opacity-50"
                    >
                      {busy === `s-${it.id}` ? (
                        <Loader2 size={9} className="animate-spin" />
                      ) : (
                        <Bell size={9} />
                      )}
                      Serve
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {onConfirmOrder && o.status === "PLACED" && (
            <button
              onClick={() => onConfirmOrder(o.id)}
              disabled={busy === `c-${o.id}`}
              data-testid={`confirm-order-${o.id}`}
              className="mt-3 w-full flex items-center justify-center gap-2 rounded-full bg-brand hover:bg-brandHover text-white text-sm font-medium py-2 transition disabled:opacity-50"
            >
              {busy === `c-${o.id}` ? (
                <Loader2 className="animate-spin" size={12} />
              ) : (
                <CheckCircle2 size={12} />
              )}
              Confirm Order
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
