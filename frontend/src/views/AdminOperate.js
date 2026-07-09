import React from "react";
import { useNavigate } from "react-router-dom";
import WaiterTablesPage from "./WaiterTablesPage";
import CashierTablesPage from "./CashierTablesPage";
import { LayoutDashboard, UtensilsCrossed, Wallet } from "lucide-react";

/**
 * Operate view for the admin — reuses waiter/cashier pages entirely.
 * Admin toggles between "Waiter" and "Cashier" mode; NO Kitchen (per spec).
 */
export default function AdminOperate() {
  const nav = useNavigate();
  const [mode, setMode] = React.useState(
    () => localStorage.getItem("admin_operate_mode") || "waiter"
  );

  const switchMode = (m) => {
    localStorage.setItem("admin_operate_mode", m);
    setMode(m);
  };

  return (
    <div className="min-h-screen bg-bg">
      <div className="glass border-b border-white/40 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => nav("/staff/admin")}
              data-testid="operate-back"
              className="text-sm text-ink2 hover:text-brand flex items-center gap-1.5 transition"
            >
              <LayoutDashboard size={13} />
              Console
            </button>
            <span className="text-ink2/40">|</span>
            <div className="text-[10px] uppercase tracking-widest text-ink2 font-semibold">
              Operate as
            </div>
            <div className="inline-flex rounded-full bg-bg2/60 p-1">
              <button
                onClick={() => switchMode("waiter")}
                data-testid="operate-waiter"
                className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 transition ${
                  mode === "waiter"
                    ? "bg-white shadow-soft text-ink"
                    : "text-ink2 hover:text-ink"
                }`}
              >
                <UtensilsCrossed size={11} />
                Waiter
              </button>
              <button
                onClick={() => switchMode("cashier")}
                data-testid="operate-cashier"
                className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 transition ${
                  mode === "cashier"
                    ? "bg-white shadow-soft text-ink"
                    : "text-ink2 hover:text-ink"
                }`}
              >
                <Wallet size={11} />
                Cashier
              </button>
            </div>
          </div>
        </div>
      </div>

      {mode === "waiter" ? <WaiterTablesPage /> : <CashierTablesPage />}
    </div>
  );
}
