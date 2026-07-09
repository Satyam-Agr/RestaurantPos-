import React from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, UtensilsCrossed, UserCircle2, ArrowLeft } from "lucide-react";

const ROLE_HOME = {
  WAITER: "/staff/waiter",
  KITCHEN: "/staff/kitchen",
  CASHIER: "/staff/cashier",
  ADMIN: "/staff/admin",
};

export default function StaffShell({ title, subtitle, children, testId, showBack }) {
  const nav = useNavigate();
  const staff = JSON.parse(localStorage.getItem("staff_info") || "null");
  const home = ROLE_HOME[staff?.role] || "/staff/login";

  const logout = () => {
    localStorage.removeItem("staff_token");
    localStorage.removeItem("staff_info");
    nav("/staff/login");
  };

  return (
    <div className="min-h-screen bg-bg" data-testid={testId}>
      <header className="glass border-b border-white/40 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {showBack && (
              <button
                onClick={() => (window.history.length > 1 ? nav(-1) : nav(home))}
                data-testid="staff-back-btn"
                className="flex items-center gap-1 text-sm text-ink2 hover:text-brand px-2 py-1 rounded-full hover:bg-bg2/60 transition"
              >
                <ArrowLeft size={14} />
                Back
              </button>
            )}
            <button
              onClick={() => nav(home)}
              data-testid="staff-home-logo"
              className="flex items-center gap-3 group"
              title="Back to dashboard"
            >
              <div className="h-9 w-9 rounded-xl bg-brand grid place-items-center text-white group-hover:scale-105 transition">
                <UtensilsCrossed size={16} />
              </div>
              <div className="text-left">
                <div className="text-[10px] uppercase tracking-[0.25em] text-ink2 font-semibold">
                  {subtitle || staff?.role}
                </div>
                <div className="font-heading text-lg font-semibold group-hover:text-brand transition">
                  {title}
                </div>
              </div>
            </button>
          </div>
          <div className="flex items-center gap-3">
            {staff && (
              <div className="text-right hidden sm:block">
                <div className="text-xs text-ink2">Signed in as</div>
                <div className="text-sm font-medium">{staff.name}</div>
              </div>
            )}
            <button
              onClick={() => nav("/staff/account")}
              data-testid="staff-account-btn"
              className="flex items-center gap-1.5 text-sm text-ink2 hover:text-brand px-3 py-1.5 rounded-full hover:bg-brand/5 transition"
            >
              <UserCircle2 size={14} />
              <span className="hidden sm:inline">Account</span>
            </button>
            <button
              onClick={logout}
              data-testid="staff-logout-btn"
              className="flex items-center gap-1.5 text-sm text-ink2 hover:text-destructive px-3 py-1.5 rounded-full hover:bg-destructive/10 transition"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">{children}</main>
    </div>
  );
}
