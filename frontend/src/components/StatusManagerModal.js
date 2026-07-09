import React, { useMemo, useState } from "react";
import PinModal from "./PinModal";
import { X, Power, PowerOff, ShieldCheck, Search } from "lucide-react";
import { toast } from "sonner";

/**
 * Reusable bulk activate/deactivate manager.
 *
 * Props:
 *   title            — e.g. "Manage Staff Status"
 *   activeLabel      — copy for the LEFT pill (default "Active")
 *   inactiveLabel    — copy for the RIGHT pill (default "Inactive")
 *   activeRows       — array of currently-live rows
 *   inactiveRows     — array of currently-off rows
 *   getId(row)       — returns unique id for a row
 *   renderRow(row)   — returns JSX for the row's visible summary
 *   activateAction   — { verb: "Activate", danger: false, run: (pin, ids) => Promise }
 *   deactivateAction — { verb: "Deactivate", danger: true, run: (pin, ids) => Promise }
 *   onClose()
 *   onDone()
 */
export default function StatusManagerModal({
  title,
  activeLabel = "Active",
  inactiveLabel = "Inactive",
  activeRows = [],
  inactiveRows = [],
  getId,
  renderRow,
  searchOf,
  activateAction,
  deactivateAction,
  onClose,
  onDone,
}) {
  // side: "active" (left/green) shows live rows for deactivation
  // side: "inactive" (right/red) shows off rows for reactivation
  const [side, setSide] = useState("active");
  const [selected, setSelected] = useState(new Set());
  const [askPin, setAskPin] = useState(false);
  const [q, setQ] = useState("");

  const rowsForSide = side === "active" ? activeRows : inactiveRows;

  const filtered = useMemo(() => {
    if (!q.trim()) return rowsForSide;
    const needle = q.trim().toLowerCase();
    return rowsForSide.filter((r) => (searchOf?.(r) || "").toLowerCase().includes(needle));
  }, [rowsForSide, q, searchOf]);

  const switchSide = (next) => {
    if (next === side) return;
    setSide(next);
    setSelected(new Set());
    setQ("");
  };

  const toggleRow = (id) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length && filtered.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(getId)));
    }
  };

  const action = side === "active" ? deactivateAction : activateAction;
  const isDanger = !!action?.danger;

  const trySubmit = () => {
    if (selected.size === 0) {
      toast.error("Select at least one row.");
      return;
    }
    setAskPin(true);
  };

  const isActiveSide = side === "active";
  const allSelectedInView =
    filtered.length > 0 && filtered.every((r) => selected.has(getId(r)));

  return (
    <>
      <div
        className="fixed inset-0 z-[55] bg-black/50 grid place-items-center p-4"
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          data-testid="status-manager-modal"
          className="bg-surface rounded-3xl max-w-2xl w-full shadow-lift max-h-[90vh] flex flex-col"
        >
          <div className="flex items-center justify-between px-5 py-3 border-b border-bg2">
            <h3 className="font-heading text-lg font-semibold">{title}</h3>
            <button onClick={onClose} data-testid="status-close" className="text-ink2 hover:text-ink p-1">
              <X size={16} />
            </button>
          </div>

          {/* Sliding pill toggle */}
          <div className="px-5 pt-4">
            <div
              className="relative bg-bg border border-bg2 rounded-full p-1 grid grid-cols-2 select-none"
              data-testid="status-slider"
            >
              {/* Sliding thumb */}
              <span
                aria-hidden
                className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full transition-transform duration-300 ease-out shadow-lift ${
                  isActiveSide
                    ? "bg-successc/90 translate-x-0"
                    : "bg-destructive/90 translate-x-full"
                }`}
              />
              <button
                type="button"
                onClick={() => switchSide("active")}
                data-testid="slider-active"
                className={`relative z-10 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-full transition-colors ${
                  isActiveSide ? "text-white" : "text-ink2 hover:text-ink"
                }`}
              >
                <Power size={13} />
                {activeLabel} · {activeRows.length}
              </button>
              <button
                type="button"
                onClick={() => switchSide("inactive")}
                data-testid="slider-inactive"
                className={`relative z-10 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-full transition-colors ${
                  !isActiveSide ? "text-white" : "text-ink2 hover:text-ink"
                }`}
              >
                <PowerOff size={13} />
                {inactiveLabel} · {inactiveRows.length}
              </button>
            </div>

            <p className="mt-3 text-xs text-ink2">
              {isActiveSide
                ? `Showing ${activeLabel.toLowerCase()} entries. Select rows to ${deactivateAction?.verb?.toLowerCase() || "deactivate"}.`
                : `Showing ${inactiveLabel.toLowerCase()} entries. Select rows to ${activateAction?.verb?.toLowerCase() || "activate"}.`}
            </p>
          </div>

          {/* Search + select-all */}
          <div className="px-5 mt-3 flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink2" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search…"
                data-testid="status-search"
                className="w-full bg-bg border border-bg2 rounded-xl pl-8 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            <label className="flex items-center gap-1.5 text-xs text-ink2 shrink-0">
              <input
                type="checkbox"
                checked={allSelectedInView}
                onChange={toggleAll}
                disabled={filtered.length === 0}
                data-testid="status-select-all"
              />
              Select all
            </label>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2 min-h-[200px]">
            {filtered.length === 0 ? (
              <div className="text-center py-10 text-ink2 text-sm italic">
                Nothing to show here.
              </div>
            ) : (
              filtered.map((row) => {
                const id = getId(row);
                const isSel = selected.has(id);
                return (
                  <label
                    key={id}
                    data-testid={`status-row-${id}`}
                    className={`flex items-center gap-3 rounded-2xl border px-3 py-2 cursor-pointer transition ${
                      isSel
                        ? isActiveSide
                          ? "border-destructive/50 bg-destructive/5"
                          : "border-successc/50 bg-successc/5"
                        : "border-bg2 bg-bg hover:border-brand/30"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSel}
                      onChange={() => toggleRow(id)}
                      data-testid={`status-check-${id}`}
                      className="accent-brand"
                    />
                    <div className="flex-1 min-w-0">{renderRow(row)}</div>
                  </label>
                );
              })
            )}
          </div>

          <div className="border-t border-bg2 px-5 py-3 flex items-center justify-between gap-3">
            <span className="text-xs text-ink2">
              {selected.size} selected
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
                disabled={selected.size === 0}
                data-testid="status-submit"
                className={`flex items-center gap-1.5 rounded-full text-white text-sm px-5 py-2 shadow-lift disabled:opacity-40 ${
                  isDanger
                    ? "bg-destructive hover:opacity-90"
                    : "bg-successc hover:opacity-90"
                }`}
              >
                <ShieldCheck size={13} />
                {action?.verb || "Submit"} {selected.size ? `(${selected.size})` : ""}
              </button>
            </div>
          </div>
        </div>
      </div>

      {askPin && (
        <PinModal
          title={`Confirm ${action?.verb || "action"}`}
          description={`${action?.verb} ${selected.size} ${selected.size === 1 ? "entry" : "entries"}. Enter your admin PIN.`}
          danger={isDanger}
          onClose={() => setAskPin(false)}
          onSubmit={async (pin) => {
            await action.run(pin, Array.from(selected));
            toast.success(`${action.verb}d ${selected.size}`);
            setAskPin(false);
            setSelected(new Set());
            onDone?.();
          }}
        />
      )}
    </>
  );
}
