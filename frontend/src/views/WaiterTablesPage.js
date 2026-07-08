import React, { useCallback, useEffect, useState } from "react";
import StaffShell from "../components/StaffShell";
import StaffTabs from "../components/StaffTabs";
import TableGrid from "../components/TableGrid";
import StatusBadge from "../components/StatusBadge";
import useTableOverview from "../hooks/useTableOverview";
import {
  waiterTablesList,
  waiterTableDetail,
  waiterConfirm,
  waiterServeItem,
  waiterRequestBillForTable,
} from "../lib/api";
import { toast } from "sonner";
import {
  X,
  Users,
  KeyRound,
  Loader2,
  CheckCircle2,
  Bell,
  Receipt,
} from "lucide-react";

const ITEM_STATUS_TONE = {
  PENDING: "bg-slate-100 text-slate-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  PREPARING: "bg-amber-100 text-amber-800",
  READY: "bg-emerald-100 text-emerald-800",
  SERVED: "bg-successc/15 text-successc",
  CANCELLED: "bg-red-100 text-red-700",
};

export default function WaiterTablesPage() {
  const { tables, loading, refresh } = useTableOverview(waiterTablesList);
  const [active, setActive] = useState(null); // TableSummaryResponse (from the grid)

  return (
    <StaffShell title="Restaurant Floor" subtitle="WAITER" testId="waiter-tables-page">
      <StaffTabs current="tables" role="waiter" refreshing={loading} onRefresh={refresh} />
      <TableGrid
        tables={tables}
        role="waiter"
        activeTableId={active?.tableId}
        loading={loading}
        onSelect={setActive}
      />
      {active && (
        <WaiterTableDetail
          summary={active}
          onClose={() => setActive(null)}
        />
      )}
    </StaffShell>
  );
}

// ---------------- Detail Panel ----------------

function WaiterTableDetail({ summary, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await waiterTableDetail(summary.tableId);
      setDetail(d);
    } catch (e) {
      toast.error(e.message);
      onClose();
    } finally {
      setLoading(false);
    }
  }, [summary.tableId, onClose]);

  useEffect(() => {
    load();
  }, [load]);

  // React to overviewStatus changes pushed via WS on the parent — keep the panel fresh.
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary.overviewStatus, summary.ordersAwaitingConfirmation, summary.itemsReadyToServe]);

  const confirmOrder = async (orderId) => {
    setBusy(`c-${orderId}`);
    try {
      await waiterConfirm(orderId);
      toast.success(`Order #${orderId} confirmed`);
      load();
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
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  };

  const requestBill = async () => {
    setBusy("bill");
    try {
      await waiterRequestBillForTable(summary.tableId);
      toast.success("Bill requested");
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  };

  const canRequestBill = detail?.overviewStatus === "SERVED_AWAITING_BILL";

  return (
    <DetailPanel onClose={onClose} testId="waiter-table-detail">
      {loading || !detail ? (
        <div className="grid place-items-center py-16">
          <Loader2 className="animate-spin text-brand" size={24} />
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-ink2 font-semibold">
                Table
              </div>
              <div className="font-heading text-4xl font-bold tracking-tight">
                {detail.tableNumber}
              </div>
              <div className="mt-2">
                <StatusBadge status={detail.overviewStatus} />
              </div>
            </div>
            {detail.pin && (
              <div className="bg-brand/10 border border-brand/20 rounded-2xl px-3 py-2 text-right">
                <div className="text-[9px] uppercase tracking-widest text-brand/80 font-semibold flex items-center gap-1 justify-end">
                  <KeyRound size={10} />
                  PIN
                </div>
                <div className="font-mono font-bold tracking-[0.3em] text-brand text-base">
                  {detail.pin}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-ink2 mb-5">
            <span className="inline-flex items-center gap-1.5">
              <Users size={12} />
              {detail.participantCount} {detail.participantCount === 1 ? "person" : "people"}
            </span>
            {detail.openedAt && (
              <span>
                Opened{" "}
                {new Date(detail.openedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>

          {/* Orders */}
          <div className="space-y-3">
            {(!detail.orders || detail.orders.length === 0) && (
              <div className="text-center text-ink2 py-6 border border-dashed border-bg2 rounded-2xl">
                No submitted orders yet.
              </div>
            )}
            {detail.orders?.map((o) => (
              <div key={o.id} className="bg-bg rounded-2xl p-3 border border-bg2">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] uppercase tracking-widest text-ink2 font-semibold">
                    Order #{o.id}
                  </div>
                  <span
                    className={`text-[9px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-full ${
                      o.status === "PLACED"
                        ? "bg-blue-100 text-blue-700"
                        : o.status === "SERVED"
                        ? "bg-successc/15 text-successc"
                        : "bg-slate-100 text-slate-700"
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
                        {it.itemStatus === "READY" && (
                          <button
                            onClick={() => serveItem(it.id)}
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
                {o.status === "PLACED" && (
                  <button
                    onClick={() => confirmOrder(o.id)}
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

          {/* Request Bill — only shown when everything's served */}
          {canRequestBill && !detail.billRequested && (
            <button
              onClick={requestBill}
              disabled={busy === "bill"}
              data-testid="waiter-request-bill-btn"
              className="mt-5 w-full flex items-center justify-center gap-2 rounded-full bg-ink hover:bg-black text-white font-medium py-3 shadow-lift transition disabled:opacity-50"
            >
              {busy === "bill" ? (
                <Loader2 className="animate-spin" size={14} />
              ) : (
                <Receipt size={14} />
              )}
              Request Bill
            </button>
          )}

          {detail.billRequested && (
            <div className="mt-5 text-center rounded-2xl border border-yellow-300 bg-yellow-50 text-yellow-800 py-3 text-sm font-medium">
              Bill already requested — waiting for cashier.
            </div>
          )}
        </>
      )}
    </DetailPanel>
  );
}

// ---------------- Detail Panel Chrome ----------------

export function DetailPanel({ onClose, testId, children }) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-stretch sm:justify-end"
      data-testid={testId}
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="relative z-10 w-full sm:w-[440px] max-h-[92vh] sm:max-h-full bg-surface sm:h-full rounded-t-3xl sm:rounded-none shadow-lift animate-fadeUp overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-end p-3 bg-surface/95 backdrop-blur border-b border-bg2 z-10">
          <button
            onClick={onClose}
            data-testid="detail-close-btn"
            className="text-ink2 hover:text-ink p-1.5 rounded-full hover:bg-bg2"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
