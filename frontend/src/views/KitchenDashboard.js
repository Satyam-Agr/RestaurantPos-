import React, { useCallback, useEffect, useState } from "react";
import StaffShell from "../components/StaffShell";
import StaffTabs from "../components/StaffTabs";
import TableGrid from "../components/TableGrid";
import StatusBadge from "../components/StatusBadge";
import OrderList from "../components/OrderList";
import DetailPanel from "../components/DetailPanel";
import useTableOverview from "../hooks/useTableOverview";
import {
  kitchenQueue,
  kitchenSetItemStatus,
  kitchenTablesList,
  kitchenTableDetail,
} from "../lib/api";
import { createStompClient } from "../lib/ws";
import { toast } from "sonner";
import { ChefHat, Bell, Loader2, PlayCircle, Users } from "lucide-react";

/**
 * Single-route Kitchen workspace. Now has both a restaurant-floor view and
 * the classic item queue — both switched via internal tab state.
 */
export default function KitchenDashboard({ embedded = false }) {
  const [tab, setTab] = useState("tables");

  const content = tab === "tables" ? <KitchenTablesView /> : <KitchenQueueView />;

  if (embedded) {
    return (
      <div data-testid="kitchen-workspace" className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <StaffTabs current={tab} onChange={setTab} />
        {content}
      </div>
    );
  }
  return (
    <StaffShell title="Kitchen" subtitle="KITCHEN" testId="kitchen-dashboard">
      <StaffTabs current={tab} onChange={setTab} />
      {content}
    </StaffShell>
  );
}

// ---------------- Tables view ----------------

function KitchenTablesView() {
  const { tables, loading, refresh } = useTableOverview(kitchenTablesList);
  const [active, setActive] = useState(null);
  return (
    <div data-testid="kitchen-tables-page">
      <div className="flex justify-end mb-2">
        <button onClick={refresh} disabled={loading} className="text-xs text-ink2 hover:text-brand transition">
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      <TableGrid
        tables={tables}
        role="kitchen"
        activeTableId={active?.tableId}
        loading={loading}
        onSelect={(t) => t.overviewStatus !== "AVAILABLE" && setActive(t)}
      />
      {active && <KitchenTableDetail summary={active} onClose={() => setActive(null)} />}
    </div>
  );
}

function KitchenTableDetail({ summary, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setDetail(await kitchenTableDetail(summary.tableId)); }
    catch (e) { toast.error(e.message); onClose(); }
    finally { setLoading(false); }
  }, [summary.tableId, onClose]);

  useEffect(() => {
    load();
  }, [load, summary.overviewStatus, summary.itemsInKitchen, summary.itemsReadyToServe]);

  return (
    <DetailPanel onClose={onClose} testId="kitchen-table-detail">
      {loading || !detail ? (
        <div className="grid place-items-center py-16"><Loader2 className="animate-spin text-brand" size={24} /></div>
      ) : (
        <>
          <div className="mb-4">
            <div className="text-[10px] uppercase tracking-widest text-ink2 font-semibold">Table</div>
            <div className="font-heading text-4xl font-bold tracking-tight">{detail.tableNumber}</div>
            <div className="mt-2"><StatusBadge status={detail.overviewStatus} /></div>
          </div>
          <div className="flex items-center gap-4 text-xs text-ink2 mb-5">
            {detail.participantCount != null && (
              <span className="inline-flex items-center gap-1.5">
                <Users size={12} />{detail.participantCount} {detail.participantCount === 1 ? "person" : "people"}
              </span>
            )}
            {detail.openedAt && (
              <span>Opened {new Date(detail.openedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            )}
          </div>
          {detail.billRequested && (
            <div className="mb-5 text-center rounded-2xl border border-yellow-300 bg-yellow-50 text-yellow-800 py-3 text-sm font-medium">
              Bill requested — no new items expected.
            </div>
          )}
          {detail.orders && detail.orders.length > 0 ? (
            <OrderList orders={detail.orders} />
          ) : (
            <div className="text-center py-8 text-ink2 italic">No orders on this table yet.</div>
          )}
        </>
      )}
    </DetailPanel>
  );
}

// ---------------- Queue view ----------------

function KitchenQueueView() {
  const [queue, setQueue] = useState([]);
  const [busy, setBusy] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try { setQueue(await kitchenQueue()); }
    catch (e) { toast.error(e.message); }
    finally { setRefreshing(false); }
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
    try { await kitchenSetItemStatus(itemId, next); toast.success(`Marked ${next}`); refresh(); }
    catch (e) { toast.error(e.message); }
    finally { setBusy(null); }
  };

  const cookableItems = [];
  queue.forEach((o) => {
    (o.items || []).forEach((it) => {
      if (["CONFIRMED", "PREPARING"].includes(it.itemStatus)) {
        cookableItems.push({ order: o, item: it });
      }
    });
  });

  return (
    <div data-testid="kitchen-queue-view">
      <div className="flex items-center justify-between mb-4">
        <p className="text-ink2">{cookableItems.length} items in queue</p>
        <button onClick={refresh} disabled={refreshing} data-testid="kitchen-refresh-btn" className="text-xs text-ink2 hover:text-brand transition">
          {refreshing ? "Refreshing…" : "Refresh"}
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
          <div key={item.id} data-testid={`kitchen-item-${item.id}`} className={`rounded-2xl p-4 border animate-fadeUp ${item.itemStatus === "PREPARING" ? "bg-amber-50 border-amber-200" : "bg-surface border-bg2"}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] uppercase tracking-widest text-ink2 font-semibold">Table {order.tableNumber} · #{order.id}</div>
              <span className={`text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${item.itemStatus === "PREPARING" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-700"}`}>{item.itemStatus}</span>
            </div>
            <div className="font-heading text-lg font-semibold">{item.quantity}× {item.menuItemName || item.name}</div>
            {item.notes && <div className="mt-1 text-sm text-ink2 italic">&ldquo;{item.notes}&rdquo;</div>}
            <div className="mt-4">
              {item.itemStatus === "CONFIRMED" ? (
                <button onClick={() => advance(item.id, "PREPARING")} disabled={busy === `a-${item.id}`} data-testid={`k-start-${item.id}`} className="w-full flex items-center justify-center gap-2 rounded-full bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium py-2 transition-all disabled:opacity-50">
                  {busy === `a-${item.id}` ? <Loader2 size={12} className="animate-spin" /> : <PlayCircle size={12} />}Start Preparing
                </button>
              ) : (
                <button onClick={() => advance(item.id, "READY")} disabled={busy === `a-${item.id}`} data-testid={`k-ready-${item.id}`} className="w-full flex items-center justify-center gap-2 rounded-full bg-successc hover:opacity-90 text-white text-sm font-medium py-2 transition-all disabled:opacity-50">
                  {busy === `a-${item.id}` ? <Loader2 size={12} className="animate-spin" /> : <Bell size={12} />}Mark Ready
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
