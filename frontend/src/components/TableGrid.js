import React from "react";
import TableCard from "./TableCard";
import { OVERVIEW_STATUS } from "./StatusBadge";
import { Loader2 } from "lucide-react";

/**
 * Renders a responsive grid of TableCards, sorted by urgency (most urgent first),
 * with AVAILABLE tables sinking to the bottom.
 */
export default function TableGrid({ tables, role, activeTableId, onSelect, loading }) {
  if (loading && !tables?.length) {
    return (
      <div className="grid place-items-center py-20 text-ink2">
        <Loader2 className="animate-spin text-brand" size={28} />
      </div>
    );
  }

  if (!tables?.length) {
    return (
      <div className="text-center py-20 text-ink2 border border-dashed border-bg2 rounded-3xl">
        No tables configured.
      </div>
    );
  }

  const sorted = [...tables].sort((a, b) => {
    const ua = OVERVIEW_STATUS[a.overviewStatus]?.urgency ?? 0;
    const ub = OVERVIEW_STATUS[b.overviewStatus]?.urgency ?? 0;
    if (ub !== ua) return ub - ua;
    return String(a.tableNumber).localeCompare(String(b.tableNumber), undefined, {
      numeric: true,
    });
  });

  return (
    <div
      data-testid="table-grid"
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3"
    >
      {sorted.map((t) => (
        <TableCard
          key={t.tableId}
          table={t}
          role={role}
          active={activeTableId === t.tableId}
          onClick={() => onSelect(t)}
        />
      ))}
    </div>
  );
}
