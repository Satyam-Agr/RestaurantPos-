import React, { useState } from "react";
import { generateBill } from "../lib/api";
import { BILL_DEFAULTS, BILL_LIMITS } from "../lib/config";
import { toast } from "sonner";
import { X, AlertTriangle, Loader2, IndianRupee } from "lucide-react";

/**
 * Reused by CashierDashboard (queue view) and CashierTableDetail (tables view).
 *
 * Props:
 *   - sessionId (required)
 *   - tableNumber (optional, for title)
 *   - subtotalPreview (optional — enables live preview + discount ≤ subtotal check)
 *   - onClose, onDone
 */
export default function GenerateBillModal({
  sessionId,
  tableNumber,
  subtotalPreview,
  onClose,
  onDone,
}) {
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
      const bill = await generateBill(sessionId, {
        taxRatePercent: taxNum,
        discount: discNum,
      });
      toast.success("Bill generated");
      onDone?.(bill);
    } catch (e) {
      setErr(e.message);
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        data-testid="gen-bill-modal"
        className="bg-surface rounded-3xl max-w-md w-full p-6 shadow-lift animate-fadeUp"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-xl font-semibold">
            Generate bill{tableNumber ? ` — Table ${tableNumber}` : ""}
          </h3>
          <button
            onClick={onClose}
            className="text-ink2 hover:text-ink p-1 rounded-full hover:bg-bg2"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-ink2 mb-4">
          Defaults from restaurant policy. Adjust below if needed.
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
              <PreviewRow label="Subtotal" value={preview.sub} />
              <PreviewRow label={`Tax (${taxNum || 0}%)`} value={preview.taxAmt} />
              {preview.disc > 0 && (
                <PreviewRow label="Discount" value={-preview.disc} />
              )}
              <div className="h-px bg-bg2 my-1.5" />
              <PreviewRow label="Total" value={preview.total} bold />
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
      </div>
    </div>
  );
}

function PreviewRow({ label, value, bold }) {
  return (
    <div className={`flex items-center justify-between ${bold ? "font-heading text-lg" : ""}`}>
      <span className={bold ? "text-ink" : "text-ink2"}>{label}</span>
      <span className={bold ? "text-brand font-semibold" : "text-ink"}>
        {(value < 0 ? "− " : "") + "₹" + Math.abs(Number(value) || 0).toFixed(2)}
      </span>
    </div>
  );
}
