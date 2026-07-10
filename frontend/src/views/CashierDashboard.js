import React, { useCallback, useEffect, useState } from "react";
import StaffShell from "../components/StaffShell";
import StaffTabs from "../components/StaffTabs";
import TableGrid from "../components/TableGrid";
import StatusBadge from "../components/StatusBadge";
import OrderList from "../components/OrderList";
import GenerateBillModal from "../components/GenerateBillModal";
import Receipt from "../components/Receipt";
import DetailPanel from "../components/DetailPanel";
import useTableOverview from "../hooks/useTableOverview";
import {
  cashierTablesList,
  cashierTableDetail,
  cashierRequested,
  cashierPending,
  revertBillRequest,
  payBill,
} from "../lib/api";
import { createStompClient } from "../lib/ws";
import { toast } from "sonner";
import {
  Users,
  Loader2,
  Receipt as ReceiptIcon,
  ClipboardList,
  Wallet,
  CreditCard,
  Smartphone,
  Circle,
  X,
  Undo2,
  ArrowRight,
  AlertTriangle,
  Bell,
  Printer,
  Eye,
  Clock,
} from "lucide-react";

/**
 * Single-route Cashier workspace. Tables + Queue tabs swap in-place so admin
 * can embed the same component without route redirects.
 */
export default function CashierDashboard({ embedded = false }) {
  const [tab, setTab] = useState("tables");

  const content = tab === "tables" ? <CashierTablesView /> : <CashierQueueView />;

  if (embedded) {
    return (
      <div data-testid="cashier-workspace" className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <StaffTabs current={tab} onChange={setTab} />
        {content}
      </div>
    );
  }
  return (
    <StaffShell title="Cashier" subtitle="CASHIER" testId="cashier-dashboard">
      <StaffTabs current={tab} onChange={setTab} />
      {content}
    </StaffShell>
  );
}

// ---------------- Tables view ----------------

function CashierTablesView() {
  const { tables, loading, refresh } = useTableOverview(cashierTablesList);
  const [active, setActive] = useState(null);
  return (
    <div data-testid="cashier-tables-page">
      <div className="flex justify-end mb-2">
        <button onClick={refresh} disabled={loading} className="text-xs text-ink2 hover:text-brand transition">
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      <TableGrid tables={tables} role="cashier" activeTableId={active?.tableId} loading={loading} onSelect={setActive} />
      {active && <CashierTableDetail summary={active} onClose={() => setActive(null)} />}
    </div>
  );
}

function CashierTableDetail({ summary, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showGen, setShowGen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setDetail(await cashierTableDetail(summary.tableId)); }
    catch (e) { toast.error(e.message); onClose(); }
    finally { setLoading(false); }
  }, [summary.tableId, onClose]);

  useEffect(() => {
    load();
  }, [load, summary.overviewStatus]);

  const canGenerate = detail?.overviewStatus === "SERVED_AWAITING_BILL" || detail?.overviewStatus === "BILL_REQUESTED";

  return (
    <DetailPanel onClose={onClose} testId="cashier-table-detail">
      {loading || !detail ? (
        <div className="grid place-items-center py-16"><Loader2 className="animate-spin text-brand" size={24} /></div>
      ) : (
        <>
          <div className="mb-4">
            <div className="text-[10px] uppercase tracking-widest text-ink2 font-semibold">Table</div>
            <div className="font-heading text-4xl font-bold tracking-tight">{detail.tableNumber}</div>
            <div className="mt-2"><StatusBadge status={detail.overviewStatus} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SummaryTile icon={Users} label="Guests" value={detail.participantCount ?? "—"} />
            <SummaryTile icon={ClipboardList} label="Orders" value={detail.orderCount ?? "—"} />
            {detail.openedAt && <SummaryTile icon={Clock} label="Opened" value={new Date(detail.openedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} />}
            <SummaryTile icon={Wallet} label="Est. Subtotal" value={`₹${Number(detail.estimatedTotal ?? 0).toFixed(2)}`} hint="before tax" />
          </div>
          {detail.billRequested && (
            <div className="mt-5 text-center rounded-2xl border border-yellow-300 bg-yellow-50 text-yellow-800 py-3 text-sm font-medium">
              Customer has requested the bill.
            </div>
          )}
          {detail.orders && detail.orders.length > 0 && (
            <div className="mt-5">
              <div className="text-[10px] uppercase tracking-widest text-ink2 font-semibold mb-2">Orders</div>
              <OrderList orders={detail.orders} />
            </div>
          )}
          {canGenerate ? (
            <button onClick={() => setShowGen(true)} data-testid="cashier-generate-btn" className="mt-5 w-full flex items-center justify-center gap-2 rounded-full bg-brand hover:bg-brandHover text-white font-medium py-3 shadow-lift transition">
              <ReceiptIcon size={14} />Generate Bill<ArrowRight size={14} />
            </button>
          ) : (
            <div className="mt-5 text-center text-xs text-ink2 italic">This table can be billed once all items are served.</div>
          )}
          {showGen && (
            <GenerateBillModal sessionId={detail.sessionId} tableNumber={detail.tableNumber} subtotalPreview={detail.estimatedTotal} onClose={() => setShowGen(false)} onDone={() => { setShowGen(false); onClose(); }} />
          )}
        </>
      )}
    </DetailPanel>
  );
}

function SummaryTile({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-2xl bg-bg border border-bg2 p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-ink2 font-semibold"><Icon size={11} />{label}</div>
      <div className="font-heading text-2xl font-bold mt-0.5 tracking-tight">{value}</div>
      {hint && <div className="text-[10px] text-ink2 italic">{hint}</div>}
    </div>
  );
}

// ---------------- Queue view ----------------

function CashierQueueView() {
  const [requested, setRequested] = useState([]);
  const [pending, setPending] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [genFor, setGenFor] = useState(null);
  const [revertFor, setRevertFor] = useState(null);
  const [payFor, setPayFor] = useState(null);
  const [viewBill, setViewBill] = useState(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [req, pend] = await Promise.all([
        cashierRequested().catch(() => []),
        cashierPending().catch(() => []),
      ]);
      setRequested(Array.isArray(req) ? req : []);
      setPending(Array.isArray(pend) ? pend : []);
    } catch (e) { toast.error(e.message); }
    finally { setRefreshing(false); }
  }, []);

  useEffect(() => {
    refresh();
    const { deactivate } = createStompClient({
      subscriptions: [{
        topic: "/topic/cashier",
        handler: (payload) => {
          const evt = payload?.event;
          const table = payload?.tableNumber;
          if (evt === "BILL_REQUESTED") toast.info(`Bill requested — Table ${table || ""}`);
          if (evt === "BILL_REQUEST_REVERTED") toast.info(`Bill request reverted — Table ${table || ""}`);
          if (evt === "BILL_GENERATED") toast.success(`Bill generated — Table ${table || ""}`);
          if (evt === "BILL_PAID") toast.success(`Bill paid — Table ${table || ""}`);
          refresh();
        },
      }],
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

  return (
    <div data-testid="cashier-queue-view">
      <p className="text-ink2 mb-4">{requested.length} awaiting bill · {pending.length} awaiting payment</p>
      {requested.length === 0 && pending.length === 0 && (
        <div className="text-center py-20 text-ink2 border border-dashed border-bg2 rounded-3xl">
          <ReceiptIcon size={32} className="mx-auto mb-3 text-brand" />
          <p className="font-heading text-lg">All clear.</p>
          <p className="text-sm mt-1">Bill requests will appear here as customers finish their meals.</p>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Bill Requests" Icon={Bell} color="bg-amber-100 text-amber-800" count={requested.length} empty="No pending bill requests.">
          {requested.map((r) => (
            <RequestCard key={`req-${r.sessionId ?? r.tableSessionId ?? r.tableNumber}`} req={r} onGenerate={() => setGenFor(r)} onRevert={() => setRevertFor(r)} />
          ))}
        </Section>
        <Section title="Awaiting Payment" Icon={ClipboardList} color="bg-blue-100 text-blue-700" count={pending.length} empty="No bills awaiting payment.">
          {pending.map((b) => (
            <PaymentCard key={`bill-${b.id}`} bill={b} onPay={() => setPayFor(b)} onView={() => setViewBill(b)} />
          ))}
        </Section>
      </div>
      <div className="mt-4 text-right">
        <button onClick={refresh} disabled={refreshing} data-testid="cashier-refresh-queue" className="text-xs text-ink2 hover:text-brand transition">
          {refreshing ? "Refreshing…" : "Refresh queue"}
        </button>
      </div>
      {genFor && <GenerateBillModal sessionId={genFor.sessionId ?? genFor.tableSessionId} tableNumber={genFor.tableNumber} subtotalPreview={genFor.subtotal ?? genFor.subtotalPreview} onClose={() => setGenFor(null)} onDone={() => { setGenFor(null); refresh(); }} />}
      {revertFor && <RevertConfirmModal req={revertFor} onClose={() => setRevertFor(null)} onDone={() => { setRevertFor(null); refresh(); }} />}
      {payFor && <PayBillModal bill={payFor} onClose={() => setPayFor(null)} onDone={() => { setPayFor(null); refresh(); }} />}
      {viewBill && <ViewReceiptModal bill={viewBill} onClose={() => setViewBill(null)} />}
    </div>
  );
}

// ---------------- Cards & Modals (queue) ----------------

function Section({ title, Icon, color, count, empty, children }) {
  const items = React.Children.toArray(children);
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <div className={`h-7 w-7 grid place-items-center rounded-full ${color}`}><Icon size={13} /></div>
        <h2 className="font-heading text-xl font-semibold">{title}</h2>
        <span className="text-xs text-ink2 font-mono">({count})</span>
      </div>
      <div className="space-y-3">{items.length ? items : <div className="text-center py-10 text-ink2 border border-dashed border-bg2 rounded-2xl">{empty}</div>}</div>
    </section>
  );
}

function RequestCard({ req, onGenerate, onRevert }) {
  const sessionId = req.sessionId ?? req.tableSessionId;
  const tableNumber = req.tableNumber;
  const subtotalPreview = req.subtotal ?? req.subtotalPreview ?? null;
  const itemCount = req.itemCount ?? req.items?.length ?? null;
  return (
    <div data-testid={`request-card-${sessionId}`} className="bg-surface border border-amber-200 rounded-2xl p-5 animate-fadeUp">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-ink2 font-semibold">Table {tableNumber ?? "—"}</div>
          <div className="font-heading text-xl font-semibold">Bill requested</div>
        </div>
        <div className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-full font-semibold bg-amber-100 text-amber-800">NEEDS ACTION</div>
      </div>
      {(subtotalPreview != null || itemCount != null) && (
        <div className="flex gap-4 text-sm mb-4">
          {itemCount != null && <div><div className="text-[10px] uppercase tracking-widest text-ink2">Items</div><div className="font-heading font-semibold">{itemCount}</div></div>}
          {subtotalPreview != null && <div><div className="text-[10px] uppercase tracking-widest text-ink2">Subtotal</div><div className="font-heading font-semibold text-brand">₹{Number(subtotalPreview).toFixed(2)}</div></div>}
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-2">
        <button onClick={onRevert} data-testid={`revert-bill-${sessionId}`} className="flex-1 flex items-center justify-center gap-1.5 rounded-full border border-bg2 hover:border-destructive hover:text-destructive hover:bg-destructive/5 text-ink px-4 py-2.5 text-sm font-medium transition">
          <Undo2 size={14} />Send Back to Table
        </button>
        <button onClick={onGenerate} data-testid={`generate-bill-${sessionId}`} className="flex-1 flex items-center justify-center gap-1.5 rounded-full bg-brand hover:bg-brandHover text-white px-4 py-2.5 text-sm font-medium transition-all">
          Proceed to Bill<ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

function PaymentCard({ bill, onPay, onView }) {
  const items = Array.isArray(bill.items) ? bill.items : [];
  const itemCount = items.reduce((s, i) => s + (i.quantity || 0), 0);
  return (
    <div data-testid={`bill-card-${bill.id}`} className="bg-surface border border-bg2 rounded-2xl p-5 animate-fadeUp">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-ink2 font-semibold">Table {bill.tableNumber ?? "—"} · Bill #{bill.id}</div>
          <div className="font-heading text-xl font-semibold">Awaiting payment</div>
          {bill.generatedAt && <div className="text-[11px] text-ink2 mt-0.5">Generated {new Date(bill.generatedAt).toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</div>}
        </div>
        <div className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-full font-semibold bg-blue-100 text-blue-700">UNPAID</div>
      </div>
      {items.length > 0 && (
        <div className="mb-3 bg-bg rounded-xl p-3 space-y-1 max-h-32 overflow-y-auto">
          {items.map((it, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs font-mono">
              <span className="text-ink truncate mr-2">{it.quantity}× {it.menuItemName}</span>
              <span className="text-ink2 shrink-0">₹{Number(it.lineTotal || (it.quantity || 0) * (it.unitPrice || 0)).toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
      <div className="space-y-1 text-sm">
        <Row label="Subtotal" value={bill.subtotal} />
        {bill.tax != null && <Row label={`Tax${bill.taxRatePercent != null ? ` (${bill.taxRatePercent}%)` : ""}`} value={bill.tax} />}
        {bill.discount != null && bill.discount > 0 && <Row label="Discount" value={-bill.discount} />}
        <div className="h-px bg-bg2 my-2" />
        <Row label="Total" value={bill.total} bold />
      </div>
      <div className="mt-4 flex gap-2">
        <button onClick={onView} data-testid={`view-bill-${bill.id}`} className="flex items-center justify-center gap-1.5 rounded-full border border-bg2 hover:border-brand hover:text-brand text-ink px-3 py-2.5 text-sm font-medium transition">
          <Eye size={14} />Receipt
        </button>
        <button onClick={onPay} data-testid={`pay-bill-${bill.id}`} className="flex-1 rounded-full bg-brand hover:bg-brandHover text-white font-medium py-2.5 transition-all">
          Record Payment {itemCount > 0 && <span className="opacity-70">· {itemCount} items</span>}
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className={`flex items-center justify-between ${bold ? "font-heading text-lg" : ""}`}>
      <span className={bold ? "text-ink" : "text-ink2"}>{label}</span>
      <span className={bold ? "text-brand font-semibold" : "text-ink"}>{(value < 0 ? "− " : "") + "₹" + Math.abs(Number(value) || 0).toFixed(2)}</span>
    </div>
  );
}

function Modal({ title, children, onClose, testId }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} data-testid={testId} className="bg-surface rounded-3xl max-w-md w-full p-6 shadow-lift animate-fadeUp">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-xl font-semibold">{title}</h3>
          <button onClick={onClose} className="text-ink2 hover:text-ink p-1 rounded-full hover:bg-bg2"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function RevertConfirmModal({ req, onClose, onDone }) {
  const sessionId = req.sessionId ?? req.tableSessionId;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const submit = async () => {
    setBusy(true); setErr("");
    try { await revertBillRequest(sessionId); toast.success("Sent back to table"); onDone(); }
    catch (e) { setErr(e.message); toast.error(e.message); }
    finally { setBusy(false); }
  };
  return (
    <Modal title="Send back to table?" onClose={onClose} testId="revert-modal">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-full bg-amber-100 grid place-items-center shrink-0"><Undo2 size={16} className="text-amber-700" /></div>
        <div className="text-sm text-ink2 leading-relaxed">
          This will cancel the bill request for <span className="text-ink font-medium">Table {req.tableNumber ?? ""}</span> and let the diners order more. Their served orders will remain intact.
        </div>
      </div>
      {err && <div className="mt-4 flex items-start gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2"><AlertTriangle size={16} className="mt-0.5 shrink-0" /><span>{err}</span></div>}
      <div className="mt-6 flex gap-3">
        <button onClick={onClose} className="flex-1 rounded-full border border-bg2 hover:bg-bg2/60 py-2.5 transition" data-testid="revert-cancel">Cancel</button>
        <button onClick={submit} disabled={busy} data-testid="revert-confirm" className="flex-1 flex items-center justify-center gap-2 rounded-full bg-ink hover:bg-black text-white py-2.5 transition-all disabled:opacity-50">{busy ? <Loader2 className="animate-spin" size={14} /> : <Undo2 size={14} />}Send Back</button>
      </div>
    </Modal>
  );
}

const PAY_OPTIONS = [
  { key: "CASH", label: "Cash", Icon: Wallet },
  { key: "CARD", label: "Card", Icon: CreditCard },
  { key: "UPI", label: "UPI", Icon: Smartphone },
  { key: "OTHER", label: "Other", Icon: Circle },
];

function PayBillModal({ bill, onClose, onDone }) {
  const [method, setMethod] = useState("CASH");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try { await payBill(bill.id, method); toast.success(`Payment recorded (${method})`); onDone(); }
    catch (e) { toast.error(e.message); }
    finally { setBusy(false); }
  };
  return (
    <Modal title={`Record payment — Bill #${bill.id}`} onClose={onClose} testId="pay-modal">
      <div className="text-sm text-ink2 mb-1">Total due</div>
      <div className="font-heading text-3xl font-semibold text-brand">₹{Number(bill.total || 0).toFixed(2)}</div>
      <div className="mt-6 grid grid-cols-2 gap-2">
        {PAY_OPTIONS.map(({ key, label, Icon }) => (
          <button key={key} onClick={() => setMethod(key)} data-testid={`pay-method-${key}`} className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 transition ${method === key ? "border-brand bg-brand/10 text-brand" : "border-bg2 hover:border-brand/40"}`}>
            <Icon size={16} />{label}
          </button>
        ))}
      </div>
      <button onClick={submit} disabled={busy} data-testid="pay-confirm-btn" className="mt-6 w-full flex items-center justify-center gap-2 rounded-full bg-brand hover:bg-brandHover text-white font-medium py-3 transition-all disabled:opacity-50">
        {busy ? <Loader2 className="animate-spin" size={16} /> : <ReceiptIcon size={16} />}Confirm Payment
      </button>
    </Modal>
  );
}

function ViewReceiptModal({ bill, onClose }) {
  const handlePrint = () => window.print();
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center p-4 overflow-y-auto" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} data-testid="view-receipt-modal" className="relative max-w-md w-full my-8 animate-fadeUp">
        <div className="rounded-3xl overflow-hidden shadow-lift receipt-print"><Receipt bill={bill} /></div>
        <div className="mt-3 flex items-center justify-between gap-2 print:hidden">
          <button onClick={onClose} className="text-sm rounded-full border border-white/30 bg-white/10 hover:bg-white/20 text-white px-4 py-2 backdrop-blur transition" data-testid="view-receipt-close">Close</button>
          <button onClick={handlePrint} data-testid="view-receipt-print" className="flex items-center gap-1.5 text-sm rounded-full bg-brand hover:bg-brandHover text-white px-4 py-2 shadow-lift transition"><Printer size={14} />Print</button>
        </div>
      </div>
    </div>
  );
}
