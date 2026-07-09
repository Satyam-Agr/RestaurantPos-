import React, { useState } from "react";
import { X, ShieldCheck, Loader2, AlertTriangle } from "lucide-react";

/**
 * PIN gate for destructive admin actions. **Never caches the PIN** — a fresh
 * entry is required for every invocation.
 *
 * onSubmit(pin) must return a Promise; if it rejects with { status, message },
 * the modal surfaces the message but stays open so the admin can retry.
 */
export default function PinModal({ title, description, onSubmit, onClose, danger }) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!/^\d{4,8}$/.test(pin)) {
      setErr("Enter a valid PIN.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      await onSubmit(pin);
    } catch (e2) {
      if (e2?.status === 409) setErr("No PIN set yet. Set one in your profile first.");
      else if (e2?.status === 401) setErr("Incorrect PIN.");
      else setErr(e2?.message || "Verification failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm grid place-items-center p-4"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        data-testid="pin-modal"
        className="bg-surface rounded-3xl max-w-sm w-full p-6 shadow-lift animate-fadeUp"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className={`h-9 w-9 rounded-full grid place-items-center ${
                danger ? "bg-destructive/10 text-destructive" : "bg-brand/10 text-brand"
              }`}
            >
              <ShieldCheck size={16} />
            </div>
            <h3 className="font-heading text-lg font-semibold">{title || "Confirm PIN"}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink2 hover:text-ink p-1 rounded-full hover:bg-bg2"
          >
            <X size={16} />
          </button>
        </div>

        {description && <p className="text-sm text-ink2 mb-4">{description}</p>}

        <input
          value={pin}
          onChange={(e) => {
            setPin(e.target.value.replace(/\D/g, "").slice(0, 8));
            setErr("");
          }}
          type="password"
          inputMode="numeric"
          autoFocus
          placeholder="••••"
          data-testid="pin-input"
          className="w-full bg-bg border border-bg2 rounded-xl px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] outline-none focus:ring-2 focus:ring-brand"
        />

        {err && (
          <div className="mt-3 flex items-start gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>{err}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          data-testid="pin-confirm"
          className={`mt-5 w-full flex items-center justify-center gap-2 rounded-full text-white font-medium py-2.5 transition disabled:opacity-50 ${
            danger ? "bg-destructive hover:opacity-90" : "bg-brand hover:bg-brandHover"
          }`}
        >
          {busy ? <Loader2 className="animate-spin" size={14} /> : <ShieldCheck size={14} />}
          Confirm
        </button>
      </form>
    </div>
  );
}
