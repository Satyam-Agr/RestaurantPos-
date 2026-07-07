import React, { useCallback, useEffect, useState } from "react";
import StaffShell from "../components/StaffShell";
import {
  cashierRequested,
  cashierPending,
  revertBillRequest,
  generateBill,
  payBill,
} from "../lib/api";
import { BILL_DEFAULTS, BILL_LIMITS } from "../lib/config";
import { createStompClient } from "../lib/ws";
import { toast } from "sonner";
import {
  Receipt as ReceiptIcon,
  IndianRupee,
  Loader2,
  RefreshCw,
  Wallet,
  CreditCard,
  Smartphone,
  Circle,
  X,
  Undo2,
  ArrowRight,
  AlertTriangle,
  Bell,
  ClipboardList,
  Printer,
  Eye,
} from "lucide-react";
import Receipt from "../components/Receipt";

export default function CashierDashboard() {
  const [requested, setRequested] = useState([]); // BillRequestSummary[]
  const [pending, setPending] = useState([]); // BillResponse[]
  const [refreshing, setRefreshing] = useState(false);

  const [genFor, setGenFor] = useState(null); // BillRequestSummary
  const [revertFor, setRevertFor] = useState(null); // BillRequestSummary
  const [payFor, setPayFor] = useState(null); // BillResponse
  const [viewBill, setViewBill] = useState(null); // BillResponse (read-only receipt view)

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [req, pend] = await Promise.all([
        cashierRequested().catch(() => []),
        cashierPending().catch(() => []),
      ]);
      setRequested(Array.isArray(req) ? req : []);
      setPending(Array.isArray(pend) ? pend : []);
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
          topic: "/topic/cashier",
          handler: (payload) => {
            const evt = payload?.event;
            const table = payload?.tableNumber;
            if (evt === "BILL_REQUESTED") toast.info(`Bill requested — Table ${table || ""}`);
            if (evt === "BILL_REQUEST_REVERTED")
              toast.info(`Bill request reverted — Table ${table || ""}`);
            if (evt === "BILL_GENERATED")
              toast.success(`Bill generated — Table ${table || ""}`);
            if (evt === "BILL_PAID")
              toast.success(`Bill paid — Table ${table || ""}`);
            refresh();
          },
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

  return (
    <StaffShell title="Cashier Desk" subtitle="CASHIER" testId="cashier-dashboard">
      <div className="flex items-center justify-between mb-6">
        <p className="text-ink2">
          {requested.length} awaiting bill · {pending.length} awaiting payment
        </p>
        <button
          onClick={refresh}
          disabled={refreshing}
          data-testid="cashier-refresh-btn"
          className="text-sm text-ink2 hover:text-brand flex items-center gap-1.5 transition"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {requested.length === 0 && pending.length === 0 && (
        <div className="text-center py-20 text-ink2 border border-dashed border-bg2 rounded-3xl">
          <ReceiptIcon size={32} className="mx-auto mb-3 text-brand" />
          <p className="font-heading text-lg">All clear.</p>
          <p className="text-sm mt-1">
            Bill requests will appear here as customers finish their meals.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Column A — Bill Requests */}
        <Section
          title="Bill Requests"
          Icon={Bell}
          color="bg-amber-100 text-amber-800"
          count={requested.length}
          empty="No pending bill requests."
        >
          {requested.map((r) => (
            <RequestCard
              key={`req-${r.sessionId ?? r.tableSessionId ?? r.tableNumber}`}
              req={r}
              onGenerate={() => setGenFor(r)}
              onRevert={() => setRevertFor(r)}
            />
          ))}
        </Section>

        {/* Column B — Pending Payments */}
        <Section
          title="Awaiting Payment"
          Icon={ClipboardList}
          color="bg-blue-100 text-blue-700"
          count={pending.length}
          empty="No bills awaiting payment."
        >
          {pending.map((b) => (
            <PaymentCard
              key={`bill-${b.id}`}
              bill={b}
              onPay={() => setPayFor(b)}
              onView={() => setViewBill(b)}
            />
          ))}
        </Section>
      </div>

      {genFor && (
        <GenerateBillModal
          req={genFor}
          onClose={() => setGenFor(null)}
          onDone={() => {
            setGenFor(null);
            refresh();
          }}
        />
      )}

      {revertFor && (
        <RevertConfirmModal
          req={revertFor}
          onClose={() => setRevertFor(null)}
          onDone={() => {
            setRevertFor(null);
            refresh();
          }}
        />
      )}

      {payFor && (
        <PayBillModal
          bill={payFor}
          onClose={() => setPayFor(null)}
          onDone={() => {
            setPayFor(null);
            refresh();
          }}
        />
      )}

      {viewBill && (
        <ViewReceiptModal bill={viewBill} onClose={() => setViewBill(null)} />
      )}
    </StaffShell>
  );
}

// ---------------- Sections & Cards ----------------

function Section({ title, Icon, color, count, empty, children }) {
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

function RequestCard({ req, onGenerate, onRevert }) {
  // Defensive: backend may use sessionId or tableSessionId, and may include a preview subtotal
  const sessionId = req.sessionId ?? req.tableSessionId;
  const tableNumber = req.tableNumber;
  const subtotalPreview = req.subtotal ?? req.subtotalPreview ?? null;
  const itemCount = req.itemCount ?? req.items?.length ?? null;

  return (
    <div
      data-testid={`request-card-${sessionId}`}
      className="bg-surface border border-amber-200 rounded-2xl p-5 animate-fadeUp"
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-ink2 font-semibold">
            Table {tableNumber ?? "—"}
          </div>
          <div className="font-heading text-xl font-semibold">Bill requested</div>
        </div>
        <div className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-full font-semibold bg-amber-100 text-amber-800">
          NEEDS ACTION
        </div>
      </div>

      {(subtotalPreview != null || itemCount != null) && (
        <div className="flex gap-4 text-sm mb-4">
          {itemCount != null && (
            <div>
              <div className="text-[10px] uppercase tracking-widest text-ink2">Items</div>
              <div className="font-heading font-semibold">{itemCount}</div>
            </div>
          )}
          {subtotalPreview != null && (
            <div>
              <div className="text-[10px] uppercase tracking-widest text-ink2">Subtotal</div>
              <div className="font-heading font-semibold text-brand">
                ₹{Number(subtotalPreview).toFixed(2)}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={onRevert}
          data-testid={`revert-bill-${sessionId}`}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-full border border-bg2 hover:border-destructive hover:text-destructive hover:bg-destructive/5 text-ink px-4 py-2.5 text-sm font-medium transition"
        >
          <Undo2 size={14} />
          Send Back to Table
        </button>
        <button
          onClick={onGenerate}
          data-testid={`generate-bill-${sessionId}`}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-full bg-brand hover:bg-brandHover text-white px-4 py-2.5 text-sm font-medium transition-all"
        >
          Proceed to Bill
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

function PaymentCard({ bill, onPay, onView }) {
  const items = Array.isArray(bill.items) ? bill.items : [];
  const itemCount = items.reduce((s, i) => s + (i.quantity || 0), 0);

  return (
    <div
      data-testid={`bill-card-${bill.id}`}
      className="bg-surface border border-bg2 rounded-2xl p-5 animate-fadeUp"
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-ink2 font-semibold">
            Table {bill.tableNumber ?? "—"} · Bill #{bill.id}
          </div>
          <div className="font-heading text-xl font-semibold">Awaiting payment</div>
          {bill.generatedAt && (
            <div className="text-[11px] text-ink2 mt-0.5">
              Generated {new Date(bill.generatedAt).toLocaleString([], {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          )}
        </div>
        <div className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-full font-semibold bg-blue-100 text-blue-700">
          UNPAID
        </div>
      </div>

      {/* Compact itemised preview */}
      {items.length > 0 && (
        <div className="mb-3 bg-bg rounded-xl p-3 space-y-1 max-h-32 overflow-y-auto">
          {items.map((it, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between text-xs font-mono"
            >
              <span className="text-ink truncate mr-2">
                {it.quantity}× {it.menuItemName}
              </span>
              <span className="text-ink2 shrink-0">
                ₹{Number(it.lineTotal || (it.quantity || 0) * (it.unitPrice || 0)).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-1 text-sm">
        <Row label="Subtotal" value={bill.subtotal} />
        {bill.tax != null && (
          <Row
            label={`Tax${bill.taxRatePercent != null ? ` (${bill.taxRatePercent}%)` : ""}`}
            value={bill.tax}
          />
        )}
        {bill.discount != null && bill.discount > 0 && (
          <Row label="Discount" value={-bill.discount} />
        )}
        <div className="h-px bg-bg2 my-2" />
        <Row label="Total" value={bill.total} bold />
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={onView}
          data-testid={`view-bill-${bill.id}`}
          className="flex items-center justify-center gap-1.5 rounded-full border border-bg2 hover:border-brand hover:text-brand text-ink px-3 py-2.5 text-sm font-medium transition"
        >
          <Eye size={14} />
          Receipt
        </button>
        <button
          onClick={onPay}
          data-testid={`pay-bill-${bill.id}`}
          className="flex-1 rounded-full bg-brand hover:bg-brandHover text-white font-medium py-2.5 transition-all"
        >
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
      <span className={bold ? "text-brand font-semibold" : "text-ink"}>
        {(value < 0 ? "− " : "") + "₹" + Math.abs(Number(value) || 0).toFixed(2)}
      </span>
    </div>
  );
}

// ---------------- Modals ----------------

function Modal({ title, children, onClose, testId }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        data-testid={testId}
        className="bg-surface rounded-3xl max-w-md w-full p-6 shadow-lift animate-fadeUp"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-xl font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="text-ink2 hover:text-ink p-1 rounded-full hover:bg-bg2"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function GenerateBillModal({ req, onClose, onDone }) {
  const sessionId = req.sessionId ?? req.tableSessionId;
  const subtotalPreview = req.subtotal ?? req.subtotalPreview ?? null;

  const [tax, setTax] = useState(String(BILL_DEFAULTS.taxRatePercent));
  const [discount, setDiscount] = useState(String(BILL_DEFAULTS.discount));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const taxNum = Number(tax);
  const discNum = Number(discount);

  const validate = () => {
    if (tax === "" || Number.isNaN(taxNum)) return "Tax rate is required.";
    if (taxNum < BILL_LIMITS.taxRatePercent.min || taxNum > BILL_LIMITS.taxRatePercent.max)
      return `Tax rate must be between ${BILL_LIMITS.taxRatePercent.min}% and ${BILL_LIMITS.taxRatePercent.max}%.`;
    if (discount === "" || Number.isNaN(discNum)) return "Discount is required.";
    if (discNum < BILL_LIMITS.discount.min) return "Discount cannot be negative.";
    if (subtotalPreview != null && discNum > subtotalPreview)
      return `Discount cannot exceed subtotal (₹${Number(subtotalPreview).toFixed(2)}).`;
    return null;
  };

  // Live preview
  const preview =
    subtotalPreview != null
      ? (() => {
          const sub = Number(subtotalPreview);
          const taxAmt = Math.max(0, (sub * (Number.isFinite(taxNum) ? taxNum : 0)) / 100);
          const disc = Math.max(0, Number.isFinite(discNum) ? discNum : 0);
          return { sub, taxAmt, disc, total: Math.max(0, sub + taxAmt - disc) };
        })()
      : null;

  const submit = async () => {
    const v = validate();
    if (v) {
      setErr(v);
      return;
    }
    setErr("");
    setBusy(true);
    try {
      await generateBill(sessionId, {
        taxRatePercent: taxNum,
        discount: discNum,
      });
      toast.success("Bill generated");
      onDone();
    } catch (e) {
      setErr(e.message);
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={`Generate bill — Table ${req.tableNumber ?? ""}`}
      onClose={onClose}
      testId="gen-bill-modal"
    >
      <p className="text-xs text-ink2 mb-4">
        Defaults from restaurant policy (see <code className="font-mono">lib/config.js</code>).
        Adjust below if needed.
      </p>

      <div className="space-y-3">
        <div>
          <label className="text-xs uppercase tracking-widest text-ink2 font-semibold flex items-center justify-between">
            <span>Tax Rate (%)</span>
            <span className="text-[10px] text-ink2 normal-case tracking-normal">
              {BILL_LIMITS.taxRatePercent.min}–{BILL_LIMITS.taxRatePercent.max}%
            </span>
          </label>
          <input
            value={tax}
            onChange={(e) => {
              setTax(e.target.value.replace(/[^\d.]/g, ""));
              setErr("");
            }}
            inputMode="decimal"
            data-testid="gen-tax-input"
            className="mt-1 w-full bg-bg border border-bg2 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand font-mono"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-widest text-ink2 font-semibold flex items-center justify-between">
            <span>Discount (₹)</span>
            <span className="text-[10px] text-ink2 normal-case tracking-normal">
              min ₹{BILL_LIMITS.discount.min}
            </span>
          </label>
          <input
            value={discount}
            onChange={(e) => {
              setDiscount(e.target.value.replace(/[^\d.]/g, ""));
              setErr("");
            }}
            inputMode="decimal"
            data-testid="gen-discount-input"
            className="mt-1 w-full bg-bg border border-bg2 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand font-mono"
          />
        </div>
      </div>

      {preview && (
        <div className="mt-5 p-4 rounded-2xl bg-bg border border-bg2">
          <div className="text-[10px] uppercase tracking-widest text-ink2 font-semibold mb-2">
            Preview
          </div>
          <div className="space-y-1 text-sm">
            <Row label="Subtotal" value={preview.sub} />
            <Row label={`Tax (${taxNum || 0}%)`} value={preview.taxAmt} />
            {preview.disc > 0 && <Row label="Discount" value={-preview.disc} />}
            <div className="h-px bg-bg2 my-1.5" />
            <Row label="Total" value={preview.total} bold />
          </div>
        </div>
      )}

      {err && (
        <div
          data-testid="gen-error"
          className="mt-4 flex items-start gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2"
        >
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{err}</span>
        </div>
      )}

      <button
        onClick={submit}
        disabled={busy}
        data-testid="gen-confirm-btn"
        className="mt-6 w-full flex items-center justify-center gap-2 rounded-full bg-brand hover:bg-brandHover text-white font-medium py-3 transition-all disabled:opacity-50"
      >
        {busy ? <Loader2 className="animate-spin" size={16} /> : <IndianRupee size={16} />}
        Generate Bill
      </button>
    </Modal>
  );
}

function RevertConfirmModal({ req, onClose, onDone }) {
  const sessionId = req.sessionId ?? req.tableSessionId;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setBusy(true);
    setErr("");
    try {
      await revertBillRequest(sessionId);
      toast.success("Sent back to table");
      onDone();
    } catch (e) {
      setErr(e.message);
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Send back to table?" onClose={onClose} testId="revert-modal">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-full bg-amber-100 grid place-items-center shrink-0">
          <Undo2 size={16} className="text-amber-700" />
        </div>
        <div className="text-sm text-ink2 leading-relaxed">
          This will cancel the bill request for{" "}
          <span className="text-ink font-medium">Table {req.tableNumber ?? ""}</span> and let the
          diners order more. Their served orders will remain intact.
        </div>
      </div>

      {err && (
        <div className="mt-4 flex items-start gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{err}</span>
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 rounded-full border border-bg2 hover:bg-bg2/60 py-2.5 transition"
          data-testid="revert-cancel"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={busy}
          data-testid="revert-confirm"
          className="flex-1 flex items-center justify-center gap-2 rounded-full bg-ink hover:bg-black text-white py-2.5 transition-all disabled:opacity-50"
        >
          {busy ? <Loader2 className="animate-spin" size={14} /> : <Undo2 size={14} />}
          Send Back
        </button>
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
    try {
      await payBill(bill.id, method);
      toast.success(`Payment recorded (${method})`);
      onDone();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={`Record payment — Bill #${bill.id}`}
      onClose={onClose}
      testId="pay-modal"
    >
      <div className="text-sm text-ink2 mb-1">Total due</div>
      <div className="font-heading text-3xl font-semibold text-brand">
        ₹{Number(bill.total || 0).toFixed(2)}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2">
        {PAY_OPTIONS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setMethod(key)}
            data-testid={`pay-method-${key}`}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 transition ${
              method === key
                ? "border-brand bg-brand/10 text-brand"
                : "border-bg2 hover:border-brand/40"
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      <button
        onClick={submit}
        disabled={busy}
        data-testid="pay-confirm-btn"
        className="mt-6 w-full flex items-center justify-center gap-2 rounded-full bg-brand hover:bg-brandHover text-white font-medium py-3 transition-all disabled:opacity-50"
      >
        {busy ? <Loader2 className="animate-spin" size={16} /> : <ReceiptIcon size={16} />}
        Confirm Payment
      </button>
    </Modal>
  );
}

function ViewReceiptModal({ bill, onClose }) {
  const handlePrint = () => window.print();
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        data-testid="view-receipt-modal"
        className="relative max-w-md w-full my-8 animate-fadeUp"
      >
        <div className="rounded-3xl overflow-hidden shadow-lift receipt-print">
          <Receipt bill={bill} />
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 print:hidden">
          <button
            onClick={onClose}
            className="text-sm rounded-full border border-white/30 bg-white/10 hover:bg-white/20 text-white px-4 py-2 backdrop-blur transition"
            data-testid="view-receipt-close"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            data-testid="view-receipt-print"
            className="flex items-center gap-1.5 text-sm rounded-full bg-brand hover:bg-brandHover text-white px-4 py-2 shadow-lift transition"
          >
            <Printer size={14} />
            Print
          </button>
        </div>
      </div>
    </div>
  );
}
