import React from "react";
import StatusBadge, { OVERVIEW_STATUS } from "./StatusBadge";
import { Users, ChefHat, Bell, AlertCircle } from "lucide-react";

/**
 * A single tile representing one table. Role-agnostic — accepts a `TableSummaryResponse`
 * and an optional `role` hint to decide which secondary stats to emphasize.
 */
export default function TableCard({ table, role = "waiter", onClick, active }) {
  const status = table.overviewStatus || "AVAILABLE";
  const cfg = OVERVIEW_STATUS[status] || OVERVIEW_STATUS.AVAILABLE;
  const isAvailable = status === "AVAILABLE";
  // Waiter can open AVAILABLE tables (to start a walk-in session).
  const clickable = !isAvailable || role === "waiter";

  return (
    <button
      onClick={onClick}
      disabled={!clickable}
      data-testid={`table-card-${table.tableId}`}
      className={`group relative text-left rounded-2xl border transition-all p-4 min-h-[130px] ${
        isAvailable
          ? clickable
            ? "bg-bg/40 border-dashed border-bg2 hover:border-brand hover:bg-brand/5 opacity-90 cursor-pointer"
            : "bg-bg/40 border-bg2 opacity-60 cursor-not-allowed"
          : "bg-surface border-bg2 hover:-translate-y-0.5 hover:shadow-lift cursor-pointer"
      } ${
        active
          ? "ring-2 ring-brand ring-offset-2 ring-offset-bg shadow-lift"
          : `hover:ring-2 ${cfg.ring} ring-offset-2 ring-offset-bg`
      }`}
    >
      {/* Urgency accent */}
      {cfg.urgency >= 3 && !isAvailable && (
        <div className={`absolute -top-1 -right-1 h-3 w-3 rounded-full ${cfg.dot} animate-pulse`} />
      )}

      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-ink2 font-semibold">
            Table
          </div>
          <div
            className={`font-heading text-3xl font-bold leading-none tracking-tight ${
              isAvailable ? "text-ink2" : "text-ink"
            }`}
          >
            {table.tableNumber || "—"}
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      {!isAvailable && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink2">
          {table.participantCount != null && (
            <span className="inline-flex items-center gap-1">
              <Users size={11} />
              {table.participantCount}
            </span>
          )}

          {role === "waiter" && (
            <>
              {!!table.ordersAwaitingConfirmation && (
                <span className="inline-flex items-center gap-1 text-red-600 font-semibold">
                  <AlertCircle size={11} />
                  {table.ordersAwaitingConfirmation}
                </span>
              )}
              {!!table.itemsInKitchen && (
                <span className="inline-flex items-center gap-1 text-blue-600">
                  <ChefHat size={11} />
                  {table.itemsInKitchen}
                </span>
              )}
              {!!table.itemsReadyToServe && (
                <span className="inline-flex items-center gap-1 text-orange-600 font-semibold">
                  <Bell size={11} />
                  {table.itemsReadyToServe}
                </span>
              )}
            </>
          )}

          {role === "cashier" && table.orderCount != null && (
            <span className="text-ink2">{table.orderCount} orders</span>
          )}
        </div>
      )}

      {isAvailable && (
        <div className="mt-6 text-xs italic">
          {role === "waiter" ? (
            <span className="text-brand font-medium">Tap to start table</span>
          ) : (
            <span className="text-ink2/70">No active session</span>
          )}
        </div>
      )}
    </button>
  );
}
