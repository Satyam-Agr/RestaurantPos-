import React, { useState } from "react";
import PinModal from "./PinModal";
import { X, Plus, Trash2, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

/**
 * Generic bulk-create modal.
 *
 * Props:
 *   title            — "Add Staff", "Add Tables", ...
 *   emptyDraft()     — returns a fresh blank object for one entry
 *   renderRow(entry, patch, i) — renders the form for a single entry
 *   validate(entry)  — return an error string or null
 *   onSubmit(pin, entries)  — must POST to backend and resolve/reject
 *   onDone()         — closes and refreshes the parent list
 */
export default function BulkCreateModal({
  title,
  emptyDraft,
  renderRow,
  validate,
  onSubmit,
  onClose,
  onDone,
}) {
  const [drafts, setDrafts] = useState([emptyDraft()]);
  const [askPin, setAskPin] = useState(false);

  const patch = (i) => (updates) =>
    setDrafts((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...updates } : d)));
  const remove = (i) =>
    setDrafts((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
  const add = () => setDrafts((prev) => [...prev, emptyDraft()]);

  const trySubmit = () => {
    for (let i = 0; i < drafts.length; i++) {
      const err = validate?.(drafts[i]);
      if (err) {
        toast.error(`Row ${i + 1}: ${err}`);
        return;
      }
    }
    setAskPin(true);
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[55] bg-black/50 grid place-items-center p-4"
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          data-testid="bulk-create-modal"
          className="bg-surface rounded-3xl max-w-2xl w-full shadow-lift max-h-[90vh] flex flex-col"
        >
          <div className="flex items-center justify-between px-5 py-3 border-b border-bg2">
            <h3 className="font-heading text-lg font-semibold">{title}</h3>
            <button onClick={onClose} data-testid="bulk-close">
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {drafts.map((d, i) => (
              <div
                key={i}
                data-testid={`bulk-row-${i}`}
                className="bg-bg border border-bg2 rounded-2xl p-4 relative"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[10px] uppercase tracking-widest text-ink2 font-semibold">
                    #{i + 1}
                  </div>
                  {drafts.length > 1 && (
                    <button
                      onClick={() => remove(i)}
                      data-testid={`bulk-remove-${i}`}
                      className="text-ink2 hover:text-destructive p-1"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
                {renderRow(d, patch(i), i)}
              </div>
            ))}

            <button
              type="button"
              onClick={add}
              data-testid="bulk-add-another"
              className="w-full flex items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-brand/50 text-brand hover:bg-brand/5 py-3 text-sm transition"
            >
              <Plus size={13} />
              Add another
            </button>
          </div>

          <div className="border-t border-bg2 px-5 py-3 flex items-center justify-between gap-3">
            <span className="text-xs text-ink2">
              {drafts.length} entr{drafts.length === 1 ? "y" : "ies"} · atomic (all or none)
            </span>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="rounded-full border border-bg2 px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={trySubmit}
                data-testid="bulk-submit"
                className="flex items-center gap-1.5 rounded-full bg-brand hover:bg-brandHover text-white text-sm px-5 py-2 shadow-lift"
              >
                <ShieldCheck size={13} />
                Submit
              </button>
            </div>
          </div>
        </div>
      </div>

      {askPin && (
        <PinModal
          title="Confirm with PIN"
          description={`Submitting ${drafts.length} entr${drafts.length === 1 ? "y" : "ies"}. Enter your admin PIN.`}
          onClose={() => setAskPin(false)}
          onSubmit={async (pin) => {
            await onSubmit(pin, drafts);
            toast.success(`Created ${drafts.length}`);
            setAskPin(false);
            onDone?.();
          }}
        />
      )}
    </>
  );
}

export function BulkField({ label, value, onChange, type, required, ...rest }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-widest text-ink2 font-semibold">
        {label} {required && <span className="text-destructive">*</span>}
      </span>
      <input
        type={type || "text"}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full bg-surface border border-bg2 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-brand text-sm"
        {...rest}
      />
    </label>
  );
}
