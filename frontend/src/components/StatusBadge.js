import React from "react";

// Color-coding per STAFF_TABLE_VIEW_PROMPT.md — urgency tiers.
export const OVERVIEW_STATUS = {
  NEEDS_CONFIRMATION: {
    label: "Needs Confirmation",
    tone: "bg-red-100 text-red-700 border-red-200",
    ring: "ring-red-400/40",
    dot: "bg-red-500",
    urgency: 4,
  },
  READY_TO_SERVE: {
    label: "Ready to Serve",
    tone: "bg-orange-100 text-orange-800 border-orange-200",
    ring: "ring-orange-400/40",
    dot: "bg-orange-500",
    urgency: 4,
  },
  BILL_REQUESTED: {
    label: "Bill Requested",
    tone: "bg-yellow-100 text-yellow-800 border-yellow-200",
    ring: "ring-yellow-400/40",
    dot: "bg-yellow-500",
    urgency: 3,
  },
  PREPARING: {
    label: "Preparing",
    tone: "bg-blue-100 text-blue-700 border-blue-200",
    ring: "ring-blue-400/30",
    dot: "bg-blue-500",
    urgency: 2,
  },
  SERVED_AWAITING_BILL: {
    label: "Awaiting Bill",
    tone: "bg-sky-100 text-sky-800 border-sky-200",
    ring: "ring-sky-400/30",
    dot: "bg-sky-500",
    urgency: 2,
  },
  AWAITING_ORDER: {
    label: "Awaiting Order",
    tone: "bg-slate-100 text-slate-600 border-slate-200",
    ring: "ring-slate-300/40",
    dot: "bg-slate-400",
    urgency: 1,
  },
  AVAILABLE: {
    label: "Available",
    tone: "bg-bg2/60 text-ink2 border-bg2",
    ring: "ring-transparent",
    dot: "bg-ink2/40",
    urgency: 0,
  },
};

export default function StatusBadge({ status, className = "" }) {
  const cfg = OVERVIEW_STATUS[status] || OVERVIEW_STATUS.AVAILABLE;
  return (
    <span
      data-testid={`status-badge-${status}`}
      className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-full border ${cfg.tone} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
