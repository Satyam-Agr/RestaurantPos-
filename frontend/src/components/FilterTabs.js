import React from "react";
import { CheckCircle2, XCircle, LayoutList } from "lucide-react";

/**
 * Reusable All / Live / Disabled tab strip used on admin listing views.
 *
 * Props:
 *   value: "all" | "live" | "disabled"
 *   onChange(v)
 *   counts?: { all, live, disabled }
 */
export default function FilterTabs({ value, onChange, counts }) {
  const tabs = [
    { id: "all", label: "All", Icon: LayoutList },
    { id: "live", label: "Live", Icon: CheckCircle2 },
    { id: "disabled", label: "Disabled", Icon: XCircle },
  ];
  return (
    <div className="inline-flex rounded-full bg-bg2/60 p-1 mb-4" data-testid="admin-filter-tabs">
      {tabs.map(({ id, label, Icon }) => {
        const active = value === id;
        const n = counts?.[id];
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            data-testid={`filter-${id}`}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 transition ${
              active
                ? "bg-white shadow-soft text-ink"
                : "text-ink2 hover:text-ink"
            }`}
          >
            <Icon size={12} />
            {label}
            {n != null && (
              <span
                className={`text-[10px] font-mono rounded-full px-1.5 py-0.5 ${
                  active ? "bg-brand text-white" : "bg-white/60 text-ink2"
                }`}
              >
                {n}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
