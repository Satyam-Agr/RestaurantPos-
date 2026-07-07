import React, { useCallback, useEffect, useState } from "react";
import StaffShell from "../components/StaffShell";
import { cashierPending, generateBill, payBill } from "../lib/api";
import { createStompClient } from "../lib/ws";
import { toast } from "sonner";
import {
  Receipt,
  IndianRupee,
  Loader2,
  RefreshCw,
  Wallet,
  CreditCard,
  Smartphone,
  Circle,
  X,
} from "lucide-react";

export default function CashierDashboard() {
  const [bills, setBills] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [genFor, setGenFor] = useState(null); // { sessionId, tableNumber }
  const [payFor, setPayFor] = useState(null); // bill

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const b = await cashierPending();
      setBills(b);
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
            if (payload?.type === "BILL_REQUESTED") {
              toast.info(`Bill requested for table ${payload.tableNumber || ""}`.trim());
            }
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
      <div className="flex items-center justify-between mb-4">
        <p className="text-ink2">{bills.length} pending bill(s)</p>
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

      {bills.length === 0 && (
        <div className="text-center py-20 text-ink2 border border-dashed border-bg2 rounded-3xl">
          <Receipt size={32} className="mx-auto mb-3 text-brand" />
          <p className="font-heading text-lg">No pending bills.</p>
          <p className="text-sm mt-1">
            Bills appear here after customers request the bill from their table.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {bills.map((b) => (
          <BillCard
            key={b.id || `sess-${b.sessionId}`}
            bill={b}
            onGenerate={() => setGenFor({ sessionId: b.sessionId, tableNumber: b.tableNumber })}
            onPay={() => setPayFor(b)}
          />
        ))}
      </div>

      {genFor && (
        <GenerateBillModal
          info={genFor}
          onClose={() => setGenFor(null)}
          onDone={() => {
            setGenFor(null);
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
    </StaffShell>
  );
}

function BillCard({ bill, onGenerate, onPay }) {
  const generated = bill.total != null && bill.id;
  return (
    <div
      data-testid={`bill-card-${bill.sessionId}`}
      className="bg-surface border border-bg2 rounded-2xl p-5 animate-fadeUp"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-ink2 font-semibold">
            Table {bill.tableNumber || "—"}
          </div>
          <div className="font-heading text-xl font-semibold">
            {generated ? `Bill #${bill.id}` : "Bill requested"}
          </div>
        </div>
        <div
          className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded-full font-semibold ${
            generated ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-700"
          }`}
        >
          {generated ? "AWAITING PAYMENT" : "AWAITING BILL"}
        </div>
      </div>

      {generated ? (
        <>
          <div className="mt-4 space-y-1 text-sm">
            <Row label="Subtotal" value={bill.subtotal} />
            {bill.tax != null && <Row label={`Tax (${bill.taxRatePercent ?? ""}%)`} value={bill.tax} />}
            {bill.discount != null && bill.discount > 0 && (
              <Row label="Discount" value={-bill.discount} />
            )}
            <div className="h-px bg-bg2 my-2" />
            <Row label="Total" value={bill.total} bold />
          </div>
          <button
            onClick={onPay}
            data-testid={`pay-bill-${bill.id}`}
            className="mt-4 w-full rounded-full bg-brand hover:bg-brandHover text-white font-medium py-2.5 transition-all"
          >
            Record Payment
          </button>
        </>
      ) : (
        <button
          onClick={onGenerate}
          data-testid={`generate-bill-${bill.sessionId}`}
          className="mt-4 w-full rounded-full bg-brand hover:bg-brandHover text-white font-medium py-2.5 transition-all"
        >
          Generate Bill
        </button>
      )}
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

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center p-4">
      <div className="bg-surface rounded-3xl max-w-md w-full p-6 shadow-lift animate-fadeUp">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-xl font-semibold">{title}</h3>
          <button onClick={onClose} className="text-ink2 hover:text-ink p-1 rounded-full hover:bg-bg2">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function GenerateBillModal({ info, onClose, onDone }) {
  const [tax, setTax] = useState("5");
  const [discount, setDiscount] = useState("0");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await generateBill(info.sessionId, {
        taxRatePercent: Number(tax) || 0,
        discount: Number(discount) || 0,
      });
      toast.success("Bill generated");
      onDone();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={`Generate bill — Table ${info.tableNumber || ""}`} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="text-xs uppercase tracking-widest text-ink2 font-semibold">
            Tax Rate (%)
          </label>
          <input
            value={tax}
            onChange={(e) => setTax(e.target.value.replace(/[^\d.]/g, ""))}
            data-testid="gen-tax-input"
            className="mt-1 w-full bg-bg border border-bg2 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-widest text-ink2 font-semibold">
            Discount (₹)
          </label>
          <input
            value={discount}
            onChange={(e) => setDiscount(e.target.value.replace(/[^\d.]/g, ""))}
            data-testid="gen-discount-input"
            className="mt-1 w-full bg-bg border border-bg2 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
      </div>
      <button
        onClick={submit}
        disabled={busy}
        data-testid="gen-confirm-btn"
        className="mt-6 w-full flex items-center justify-center gap-2 rounded-full bg-brand hover:bg-brandHover text-white font-medium py-3 transition-all disabled:opacity-50"
      >
        {busy ? <Loader2 className="animate-spin" size={16} /> : <IndianRupee size={16} />}
        Generate
      </button>
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
    <Modal title={`Record payment — Bill #${bill.id}`} onClose={onClose}>
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
        {busy ? <Loader2 className="animate-spin" size={16} /> : <Receipt size={16} />}
        Confirm Payment
      </button>
    </Modal>
  );
}
