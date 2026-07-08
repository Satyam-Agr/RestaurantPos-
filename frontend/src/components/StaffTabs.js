import React from "react";
import { useNavigate } from "react-router-dom";
import { LayoutGrid, ListChecks, RefreshCw } from "lucide-react";

export default function StaffTabs({ current, role, refreshing, onRefresh }) {
  const nav = useNavigate();
  const base = `/staff/${role}`;

  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="inline-flex rounded-full bg-bg2/60 p-1">
        <button
          onClick={() => nav(`${base}/tables`)}
          data-testid="tab-tables"
          className={`px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 transition ${
            current === "tables"
              ? "bg-white shadow-soft text-ink"
              : "text-ink2 hover:text-ink"
          }`}
        >
          <LayoutGrid size={14} />
          Tables
        </button>
        <button
          onClick={() => nav(`${base}/queue`)}
          data-testid="tab-queue"
          className={`px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 transition ${
            current === "queue"
              ? "bg-white shadow-soft text-ink"
              : "text-ink2 hover:text-ink"
          }`}
        >
          <ListChecks size={14} />
          Queue
        </button>
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
