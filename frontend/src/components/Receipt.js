import React from "react";
import { UtensilsCrossed, MapPin, FileText, CheckCircle2, Clock } from "lucide-react";

const PAYMENT_LABEL = {
  CASH: "Cash",
  CARD: "Card",
  UPI: "UPI",
  OTHER: "Other",
};

/**
 * Professional-looking restaurant receipt.
 *
 * Renders the full BillResponse in a receipt-paper style with:
 *   - Restaurant header (name, address, GSTIN)
 *   - Bill/session metadata (bill #, table, timestamps)
 *   - Itemised line items (name, qty × unit, line total)
 *   - Subtotal / Tax (with rate %) / Discount / Total
 *   - Payment status badge (unpaid / paid + method)
 *
 * Missing fields are hidden gracefully — backend may omit some.
 */
export default function Receipt({ bill, compact = false }) {
  if (!bill) return null;
  const paid = !!bill.paidAt;
  const items = Array.isArray(bill.items) ? bill.items : [];

  return (
    <div
      data-testid="receipt"
      className={`bg-[#FFFDF7] text-ink font-body relative ${
        compact ? "p-4" : "p-6 sm:p-8"
      } print:p-0 print:bg-white`}
    >
      {/* Torn-paper effect at edges (screen only) */}
      <div
        aria-hidden
        className="absolute inset-x-0 -top-2 h-3 print:hidden"
        style={{
          backgroundImage:
            "radial-gradient(circle at 6px 0, transparent 6px, #FFFDF7 6px)",
          backgroundSize: "12px 12px",
        }}
      />

      {/* Header */}
      <div className="text-center border-b border-dashed border-ink/20 pb-4">
        <div className="inline-flex items-center gap-1.5 mb-1 text-brand">
          <UtensilsCrossed size={14} />
          <span className="text-[10px] uppercase tracking-[0.35em] font-semibold">
            Receipt
          </span>
        </div>
        <div className="font-heading text-2xl font-bold tracking-tight">
          {bill.restaurantName || "Trattoria"}
        </div>
        {bill.restaurantAddress && (
          <div className="flex items-start justify-center gap-1 mt-1 text-xs text-ink2 leading-snug">
            <MapPin size={11} className="mt-0.5 shrink-0" />
            <span>{bill.restaurantAddress}</span>
          </div>
        )}
        {bill.restaurantGstin && (
          <div className="flex items-center justify-center gap-1 mt-1 text-[11px] font-mono text-ink2">
            <FileText size={10} />
            GSTIN: {bill.restaurantGstin}
          </div>
        )}
      </div>

      {/* Metadata grid */}
      <div className="grid grid-cols-2 gap-y-1.5 mt-4 text-[11px] font-mono">
        <MetaRow label="Bill No." value={`#${bill.id}`} />
        <MetaRow label="Table" value={bill.tableNumber ?? "—"} align="right" />
        <MetaRow label="Generated" value={formatDateTime(bill.generatedAt)} />
        {bill.paidAt && (
          <MetaRow label="Paid at" value={formatDateTime(bill.paidAt)} align="right" />
        )}
      </div>

      <div className="border-t border-dashed border-ink/20 my-4" />

      {/* Line items */}
      {items.length > 0 ? (
        <div className="space-y-1.5">
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 text-[10px] uppercase tracking-widest text-ink2 font-semibold pb-1 border-b border-ink/10">
            <span>Item</span>
            <span className="text-right">Qty × Rate</span>
            <span className="text-right">Amount</span>
          </div>
          {items.map((it, idx) => (
            <div
              key={idx}
              className="grid grid-cols-[1fr_auto_auto] gap-x-3 text-sm font-mono py-1"
            >
              <span className="text-ink truncate">{it.menuItemName || "Item"}</span>
              <span className="text-right text-ink2">
                {it.quantity} × ₹{Number(it.unitPrice || 0).toFixed(2)}
              </span>
              <span className="text-right text-ink font-semibold">
                ₹{Number(it.lineTotal || (it.quantity || 0) * (it.unitPrice || 0)).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-xs text-ink2 italic py-2">
          Itemised breakdown not available.
        </div>
      )}

      <div className="border-t border-dashed border-ink/20 my-4" />

      {/* Totals */}
      <div className="space-y-1.5 text-sm font-mono">
        <TotalRow label="Subtotal" value={bill.subtotal} />
        {bill.tax != null && (
          <TotalRow
            label={`Tax${
              bill.taxRatePercent != null ? ` (${bill.taxRatePercent}%)` : ""
            }`}
            value={bill.tax}
          />
        )}
        {bill.discount != null && bill.discount > 0 && (
          <TotalRow label="Discount" value={-bill.discount} muted />
        )}
      </div>

      <div className="border-t-2 border-double border-ink/40 mt-3 pt-3">
        <div className="flex items-baseline justify-between font-heading">
          <span className="text-sm uppercase tracking-widest text-ink2 font-semibold">
            Total
          </span>
          <span className="text-2xl font-bold text-brand">
            ₹{Number(bill.total || 0).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Payment status */}
      <div className="mt-4 flex items-center justify-center">
        {paid ? (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-successc/10 border border-successc/30 text-successc px-3 py-1 text-[11px] font-semibold uppercase tracking-widest">
            <CheckCircle2 size={12} />
            Paid · {PAYMENT_LABEL[bill.paymentMethod] || bill.paymentMethod || "—"}
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-300 text-amber-800 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest">
            <Clock size={12} />
            Awaiting Payment
          </div>
        )}
      </div>

      <div className="border-t border-dashed border-ink/20 mt-4 pt-3 text-center">
        <div className="text-[11px] text-ink2 italic">
          Thank you for dining with us.
        </div>
        <div className="text-[10px] text-ink2/70 mt-0.5 font-mono">
          This is a computer-generated receipt.
        </div>
      </div>

      <div
        aria-hidden
        className="absolute inset-x-0 -bottom-2 h-3 print:hidden"
        style={{
          backgroundImage:
            "radial-gradient(circle at 6px 12px, transparent 6px, #FFFDF7 6px)",
          backgroundSize: "12px 12px",
        }}
      />
    </div>
  );
}

function MetaRow({ label, value, align }) {
  return (
    <div className={`flex ${align === "right" ? "justify-end" : ""} gap-1.5`}>
      <span className="text-ink2/80">{label}:</span>
      <span className="text-ink font-semibold">{value}</span>
    </div>
  );
}

function TotalRow({ label, value, muted }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-ink2" : "text-ink2"}>{label}</span>
      <span className={muted ? "text-ink" : "text-ink font-semibold"}>
        {(value < 0 ? "− " : "") + "₹" + Math.abs(Number(value) || 0).toFixed(2)}
      </span>
    </div>
  );
}

function formatDateTime(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString([], {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}
