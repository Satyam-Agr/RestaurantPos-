import React from "react";
import { LayoutGrid, ListChecks, RefreshCw } from "lucide-react";

const DEFAULT_TABS = [
  { key: "tables", label: "Tables", Icon: LayoutGrid },
  { key: "queue", label: "Queue", Icon: ListChecks },
];

/**
 * Controlled tab strip. Does not touch the router — the parent owns the
 * active-tab state and swaps content in-place. That lets Admin embed the
 * same workspace without triggering a route change (and getting bounced
 * by ProtectedStaffRoute).
 */
export default function StaffTabs({
  current,
  onChange,
  tabs = DEFAULT_TABS,
  refreshing,
  onRefresh,
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="inline-flex rounded-full bg-bg2/60 p-1">
        {tabs.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            data-testid={`tab-${key}`}
            className={`px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 transition ${
              current === key
                ? "bg-white shadow-soft text-ink"
                : "text-ink2 hover:text-ink"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={refreshing}
          data-testid="staff-refresh-btn"
          className="text-sm text-ink2 hover:text-brand flex items-center gap-1.5 transition"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      )}
    </div>
  );
}
