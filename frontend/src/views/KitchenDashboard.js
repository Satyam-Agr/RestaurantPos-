import React, { useCallback, useEffect, useState } from "react";
import StaffShell from "../components/StaffShell";
import { kitchenQueue, kitchenSetItemStatus } from "../lib/api";
import { createStompClient } from "../lib/ws";
import { toast } from "sonner";
import { ChefHat, Bell, Loader2, RefreshCw, PlayCircle } from "lucide-react";

export default function KitchenDashboard() {
  const [queue, setQueue] = useState([]);
  const [busy, setBusy] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const q = await kitchenQueue();
      setQueue(q);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const { deactivate } = createStompClient({
      subscriptions: [{ topic: "/topic/kitchen", handler: () => refresh() }],
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

  const advance = async (itemId, next) => {
    setBusy(`a-${itemId}`);
    try {
      await kitchenSetItemStatus(itemId, next);
      toast.success(`Marked ${next}`);
      refresh();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  };

  // Flatten cookable items across all orders
  const cookableItems = [];
  queue.forEach((o) => {
    (o.items || []).forEach((it) => {
      if (["CONFIRMED", "PREPARING"].includes(it.itemStatus)) {
        cookableItems.push({ order: o, item: it });
      }
    });
  });

  return (
    <StaffShell title="Kitchen Board" subtitle="KITCHEN" testId="kitchen-dashboard">
      <div className="flex items-center justify-between mb-4">
        <p className="text-ink2">{cookableItems.length} items in queue</p>
        <button
          onClick={refresh}
          disabled={refreshing}
          data-testid="kitchen-refresh-btn"
          className="text-sm text-ink2 hover:text-brand flex items-center gap-1.5 transition"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {cookableItems.length === 0 && (
        <div className="text-center py-20 text-ink2 border border-dashed border-bg2 rounded-3xl">
          <ChefHat size={32} className="mx-auto mb-3 text-brand" />
          <p className="font-heading text-lg">All caught up.</p>
          <p className="text-sm mt-1">New orders will appear here.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cookableItems.map(({ order, item }) => (
          <div
            key={item.id}
            data-testid={`kitchen-item-${item.id}`}
            className={`rounded-2xl p-4 border animate-fadeUp ${
              item.itemStatus === "PREPARING"
                ? "bg-amber-50 border-amber-200"
                : "bg-surface border-bg2"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] uppercase tracking-widest text-ink2 font-semibold">
                Table {order.tableNumber} · #{order.id}
              </div>
              <span
                className={`text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${
                  item.itemStatus === "PREPARING"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {item.itemStatus}
              </span>
            </div>
            <div className="font-heading text-lg font-semibold">
              {item.quantity}× {item.menuItemName || item.name}
            </div>
            {item.notes && (
              <div className="mt-1 text-sm text-ink2 italic">&ldquo;{item.notes}&rdquo;</div>
            )}
            <div className="mt-4">
              {item.itemStatus === "CONFIRMED" ? (
                <button
                  onClick={() => advance(item.id, "PREPARING")}
                  disabled={busy === `a-${item.id}`}
                  data-testid={`k-start-${item.id}`}
                  className="w-full flex items-center justify-center gap-2 rounded-full bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium py-2 transition-all disabled:opacity-50"
                >
                  {busy === `a-${item.id}` ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <PlayCircle size={12} />
                  )}
                  Start Preparing
                </button>
              ) : (
                <button
                  onClick={() => advance(item.id, "READY")}
                  disabled={busy === `a-${item.id}`}
                  data-testid={`k-ready-${item.id}`}
                  className="w-full flex items-center justify-center gap-2 rounded-full bg-successc hover:opacity-90 text-white text-sm font-medium py-2 transition-all disabled:opacity-50"
                >
                  {busy === `a-${item.id}` ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Bell size={12} />
                  )}
                  Mark Ready
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </StaffShell>
  );
}
