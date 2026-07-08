import React, { useCallback, useEffect, useState } from "react";
import StaffShell from "../components/StaffShell";
import StaffTabs from "../components/StaffTabs";
import TableGrid from "../components/TableGrid";
import StatusBadge from "../components/StatusBadge";
import OrderList from "../components/OrderList";
import GenerateBillModal from "../components/GenerateBillModal";
import { DetailPanel } from "./WaiterTablesPage";
import useTableOverview from "../hooks/useTableOverview";
import { cashierTablesList, cashierTableDetail } from "../lib/api";
import { toast } from "sonner";
import {
  Users,
  Loader2,
  Receipt,
  ClipboardList,
  Wallet,
  ArrowRight,
  Clock,
} from "lucide-react";

export default function CashierTablesPage() {
  const { tables, loading, refresh } = useTableOverview(cashierTablesList);
  const [active, setActive] = useState(null);

  return (
    <StaffShell title="Restaurant Floor" subtitle="CASHIER" testId="cashier-tables-page">
      <StaffTabs current="tables" role="cashier" refreshing={loading} onRefresh={refresh} />
      <TableGrid
        tables={tables}
        role="cashier"
        activeTableId={active?.tableId}
        loading={loading}
        onSelect={setActive}
      />

      {active && (
        <CashierTableDetail
          summary={active}
          onClose={() => setActive(null)}
        />
      )}
    </StaffShell>
  );
}

// ---------------- Cashier Detail Panel ----------------

function CashierTableDetail({ summary, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showGen, setShowGen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await cashierTableDetail(summary.tableId);
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

  // Refresh when summary changes via WS
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary.overviewStatus]);

  const canGenerate =
    detail?.overviewStatus === "SERVED_AWAITING_BILL" ||
    detail?.overviewStatus === "BILL_REQUESTED";

  return (
    <DetailPanel onClose={onClose} testId="cashier-table-detail">
      {loading || !detail ? (
        <div className="grid place-items-center py-16">
          <Loader2 className="animate-spin text-brand" size={24} />
        </div>
      ) : (
        <>
          <div className="mb-4">
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

          {/* Summary tiles — deliberately no itemization */}
          <div className="grid grid-cols-2 gap-3">
            <SummaryTile
              icon={Users}
              label="Guests"
              value={detail.participantCount ?? "—"}
            />
            <SummaryTile
              icon={ClipboardList}
              label="Orders"
              value={detail.orderCount ?? "—"}
            />
            {detail.openedAt && (
              <SummaryTile
                icon={Clock}
                label="Opened"
                value={new Date(detail.openedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              />
            )}
            <SummaryTile
              icon={Wallet}
              label="Est. Subtotal"
              value={`₹${Number(detail.estimatedTotal ?? 0).toFixed(2)}`}
              hint="before tax"
            />
          </div>

          {detail.billRequested && (
            <div className="mt-5 text-center rounded-2xl border border-yellow-300 bg-yellow-50 text-yellow-800 py-3 text-sm font-medium">
              Customer has requested the bill.
            </div>
          )}

          {/* Itemized orders — same layout as waiter, but read-only (no confirm/serve). */}
          {detail.orders && detail.orders.length > 0 && (
            <div className="mt-5">
              <div className="text-[10px] uppercase tracking-widest text-ink2 font-semibold mb-2">
                Orders
              </div>
              <OrderList orders={detail.orders} />
            </div>
          )}

          {/* Generate Bill */}
          {canGenerate ? (
            <button
              onClick={() => setShowGen(true)}
              data-testid="cashier-generate-btn"
              className="mt-5 w-full flex items-center justify-center gap-2 rounded-full bg-brand hover:bg-brandHover text-white font-medium py-3 shadow-lift transition"
            >
              <Receipt size={14} />
              Generate Bill
              <ArrowRight size={14} />
            </button>
          ) : (
            <div className="mt-5 text-center text-xs text-ink2 italic">
              This table can be billed once all items are served.
            </div>
          )}

          {showGen && (
            <GenerateBillModal
              sessionId={detail.sessionId}
              tableNumber={detail.tableNumber}
              subtotalPreview={detail.estimatedTotal}
              onClose={() => setShowGen(false)}
              onDone={() => {
                setShowGen(false);
                // Table will transition to AVAILABLE via WS; close panel.
                onClose();
              }}
            />
          )}
        </>
      )}
    </DetailPanel>
  );
}

function SummaryTile({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-2xl bg-bg border border-bg2 p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-ink2 font-semibold">
        <Icon size={11} />
        {label}
      </div>
      <div className="font-heading text-2xl font-bold mt-0.5 tracking-tight">
        {value}
      </div>
      {hint && <div className="text-[10px] text-ink2 italic">{hint}</div>}
    </div>
  );
}
