import React, { useState } from "react";
import { waiterStartTableSession } from "../lib/api";
import { toast } from "sonner";
import { X, Plus, Loader2, Sparkles } from "lucide-react";

/**
 * Compact popup for opening a walk-in table session.
 * Renders exactly like GenerateBillModal / other confirm popups.
 */
export default function StartTableModal({ tableId, tableNumber, onClose, onStarted }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setBusy(true);
    setErr("");
    try {
      await waiterStartTableSession(tableId);
      toast.success(`Table ${tableNumber} opened`);
      onStarted?.();
    } catch (e) {
      if (e.status === 409) setErr("This table is already active.");
      else setErr(e.message || "Failed to start table");
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
        data-testid="start-table-modal"
        className="bg-surface rounded-3xl max-w-sm w-full p-6 shadow-lift animate-fadeUp text-center"
      >
        <div className="flex justify-end -mt-2 -mr-2">
          <button
            onClick={onClose}
            className="text-ink2 hover:text-ink p-1 rounded-full hover:bg-bg2"
          >
            <X size={16} />
          </button>
        </div>

        <div className="inline-flex items-center gap-1.5 mb-3 rounded-full bg-brand/10 border border-brand/20 text-brand px-3 py-1 text-[10px] uppercase tracking-widest font-semibold">
          <Sparkles size={11} />
          Walk-in
        </div>

        <div className="text-[10px] uppercase tracking-widest text-ink2 font-semibold">
          Table
        </div>
        <div className="font-heading text-5xl font-bold tracking-tight leading-none">
          {tableNumber}
        </div>

        <p className="text-ink2 text-sm mt-5 leading-relaxed">
          Start a new order list for this table now. Others can still join later by
          scanning the QR.
        </p>

        {err && (
          <div className="mt-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">
            {err}
          </div>
        )}

        <div className="mt-6 flex gap-2">
          <button
            onClick={onClose}
            data-testid="start-table-cancel"
            className="flex-1 rounded-full border border-bg2 hover:bg-bg2/60 py-2.5 text-sm transition"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy}
            data-testid="start-table-confirm"
            className="flex-1 flex items-center justify-center gap-2 rounded-full bg-brand hover:bg-brandHover text-white font-medium py-2.5 shadow-lift transition disabled:opacity-50"
          >
            {busy ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
            Start Table
          </button>
        </div>
      </div>
    </div>
  );
}
