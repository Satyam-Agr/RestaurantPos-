import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import WaiterDashboard from "./WaiterDashboard";
import CashierDashboard from "./CashierDashboard";
import KitchenDashboard from "./KitchenDashboard";
import { LayoutDashboard, UtensilsCrossed, Wallet, ChefHat } from "lucide-react";

const MODES = [
  { key: "waiter", label: "Waiter", Icon: UtensilsCrossed },
  { key: "cashier", label: "Cashier", Icon: Wallet },
  { key: "kitchen", label: "Kitchen", Icon: ChefHat },
];

/**
 * Admin operate: swap between Waiter / Cashier / Kitchen workspaces in-place.
 * Each workspace is embedded (no StaffShell), so no route changes fire — the
 * admin can freely flip tabs inside a workspace without being redirected to
 * the login page by ProtectedStaffRoute.
 */
export default function AdminOperate() {
  const nav = useNavigate();
  const [mode, setMode] = useState(
    () => localStorage.getItem("admin_operate_mode") || "waiter"
  );

  const switchMode = (m) => {
    localStorage.setItem("admin_operate_mode", m);
    setMode(m);
  };

  const activeIdx = MODES.findIndex((m) => m.key === mode);
  const thumbTranslate = `translateX(${activeIdx * 100}%)`;

  return (
    <div className="min-h-screen bg-bg">
      <div className="glass border-b border-white/40 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-3">
          <button
            onClick={() => nav("/staff/admin")}
            data-testid="operate-back"
            className="text-sm text-ink2 hover:text-brand flex items-center gap-1.5 transition"
          >
            <LayoutDashboard size={13} />
            Console
          </button>

          <div className="flex items-center gap-3">
            <div className="text-[10px] uppercase tracking-widest text-ink2 font-semibold hidden sm:block">
              Operate as
            </div>

            {/* 3-way sliding pill */}
            <div
              data-testid="operate-mode-slider"
              className="relative bg-bg2/60 rounded-full p-1 grid grid-cols-3 select-none w-[300px]"
            >
              <span
                aria-hidden
                className="absolute top-1 bottom-1 left-1 w-[calc(33.333%-2.667px)] rounded-full bg-white shadow-soft transition-transform duration-300 ease-out"
                style={{ transform: thumbTranslate }}
              />
              {MODES.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  onClick={() => switchMode(key)}
                  data-testid={`operate-${key}`}
                  className={`relative z-10 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-full transition-colors ${
                    mode === key ? "text-ink" : "text-ink2 hover:text-ink"
                  }`}
                >
                  <Icon size={11} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {mode === "waiter" && <WaiterDashboard embedded />}
      {mode === "cashier" && <CashierDashboard embedded />}
      {mode === "kitchen" && <KitchenDashboard embedded />}
    </div>
  );
}
