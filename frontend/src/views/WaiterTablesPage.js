import React, { useCallback, useEffect, useState } from "react";
import StaffShell from "../components/StaffShell";
import StaffTabs from "../components/StaffTabs";
import TableGrid from "../components/TableGrid";
import StatusBadge from "../components/StatusBadge";
import OrderList from "../components/OrderList";
import WaiterItemPicker from "../components/WaiterItemPicker";
import useTableOverview from "../hooks/useTableOverview";
import {
  waiterTablesList,
  waiterTableDetail,
  waiterStartTableSession,
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
  Receipt,
  Plus,
  Sparkles,
} from "lucide-react";

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
  const [showPicker, setShowPicker] = useState(false);

  const isAvailable = summary.overviewStatus === "AVAILABLE";

  const load = useCallback(async () => {
    if (isAvailable) {
      setDetail(null);
      setLoading(false);
      return;
    }
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
  }, [summary.tableId, isAvailable, onClose]);

  useEffect(() => {
    load();
  }, [load]);

  // React to overviewStatus changes pushed via WS on the parent — keep the panel fresh.
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary.overviewStatus, summary.ordersAwaitingConfirmation, summary.itemsReadyToServe]);

  const startTable = async () => {
    setBusy("start");
    try {
      await waiterStartTableSession(summary.tableId);
      toast.success(`Table ${summary.tableNumber} opened`);
      // WS will push AWAITING_ORDER — the effect above will refetch, or we do it now:
      load();
    } catch (e) {
      toast.error(e.status === 409 ? "This table is already active." : e.message);
    } finally {
      setBusy(null);
    }
  };

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
  const canAddOrder =
    detail && detail.sessionId && detail.overviewStatus !== "BILL_REQUESTED";

  return (
    <DetailPanel onClose={onClose} testId="waiter-table-detail">
      {loading ? (
        <div className="grid place-items-center py-16">
          <Loader2 className="animate-spin text-brand" size={24} />
        </div>
      ) : isAvailable || !detail ? (
        // Empty state — Start Table
        <div className="text-center py-4">
          <div className="text-[10px] uppercase tracking-widest text-ink2 font-semibold">
            Table
          </div>
          <div className="font-heading text-4xl font-bold tracking-tight mb-3">
            {summary.tableNumber}
          </div>
          <div className="inline-flex items-center gap-2 mb-8 rounded-full bg-bg2/60 text-ink2 px-3 py-1 text-[10px] uppercase tracking-widest font-semibold">
            <Sparkles size={11} />
            Ready to open
          </div>
          <p className="text-ink2 text-sm max-w-xs mx-auto mb-6 leading-relaxed">
            This table has no active order list. Start one now for a walk-in guest — they
            can also join later by scanning the QR.
          </p>
          <button
            onClick={startTable}
            disabled={busy === "start"}
            data-testid="start-table-btn"
            className="inline-flex items-center gap-2 rounded-full bg-brand hover:bg-brandHover text-white font-medium px-6 py-3 shadow-lift transition disabled:opacity-50"
          >
            {busy === "start" ? (
              <Loader2 className="animate-spin" size={14} />
            ) : (
              <Plus size={14} />
            )}
            Start Table
          </button>
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

          {/* Add Order button */}
          {canAddOrder && (
            <button
              onClick={() => setShowPicker(true)}
              data-testid="add-order-btn"
              className="mb-4 w-full flex items-center justify-center gap-2 rounded-full border-2 border-dashed border-brand/50 text-brand hover:bg-brand/5 font-medium py-2.5 transition"
            >
              <Plus size={14} />
              Add Order
            </button>
          )}

          {/* Orders */}
          <OrderList
            orders={detail.orders}
            onConfirmOrder={confirmOrder}
            onServeItem={serveItem}
            busy={busy}
          />

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

          {showPicker && (
            <WaiterItemPicker
              tableId={detail.tableId}
              tableNumber={detail.tableNumber}
              onClose={() => setShowPicker(false)}
              onPlaced={() => {
                setShowPicker(false);
                load();
              }}
            />
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
