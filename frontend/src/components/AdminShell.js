import React, { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { adminMe } from "../lib/api";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Users,
  UtensilsCrossed,
  LayoutGrid,
  BarChart3,
  Receipt,
  ShieldAlert,
  LogOut,
  UserCircle2,
  ArrowLeftRight,
} from "lucide-react";

/**
 * Admin console layout — sidebar + top bar. Also detects if the admin has not
 * yet set a PIN and surfaces a persistent banner.
 */
export default function AdminShell({ title, children }) {
  const nav = useNavigate();
  const staff = JSON.parse(localStorage.getItem("staff_info") || "null");
  const [me, setMe] = useState(null);

  useEffect(() => {
    adminMe()
      .then(setMe)
      .catch(() => {});
  }, []);

  const logout = () => {
    localStorage.removeItem("staff_token");
    localStorage.removeItem("staff_info");
    toast.success("Signed out");
    nav("/staff/login");
  };

  const pinMissing = me && me.pinSet === false;

  return (
    <div className="min-h-screen bg-bg flex" data-testid="admin-shell">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-ink text-white min-h-screen p-3 hidden md:flex md:flex-col sticky top-0 h-screen">
        <div className="flex items-center gap-2 px-3 py-3 mb-2">
          <div className="h-8 w-8 rounded-lg bg-brand grid place-items-center">
            <ShieldAlert size={14} />
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-widest text-white/50 font-semibold">
              Admin
            </div>
            <div className="font-heading font-semibold text-sm">Trattoria</div>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 text-sm">
          <NavItem to="/staff/admin" icon={LayoutDashboard} label="Overview" end />
          <NavItem to="/staff/admin/tables" icon={LayoutGrid} label="Live Tables" />
          <NavItem to="/staff/admin/menu" icon={UtensilsCrossed} label="Menu" />
          <NavItem to="/staff/admin/staff" icon={Users} label="Staff" />
          <NavItem to="/staff/admin/roster" icon={LayoutGrid} label="Table Roster" />
          <NavItem to="/staff/admin/bills" icon={Receipt} label="Bills" />
          <NavItem to="/staff/admin/analytics" icon={BarChart3} label="Analytics" />
        </nav>

        <div className="mt-2 pt-3 border-t border-white/10 space-y-0.5 text-sm">
          <button
            onClick={() => nav("/staff/admin/operate")}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition"
            data-testid="admin-switch-operate"
          >
            <ArrowLeftRight size={13} />
            Switch to Operate
          </button>
          <NavLink
            to="/staff/account"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-lg transition ${
                isActive ? "bg-white/10 text-white" : "text-white/70 hover:text-white hover:bg-white/5"
              }`
            }
          >
            <UserCircle2 size={13} />
            <span className="truncate">{staff?.name || "My Account"}</span>
          </NavLink>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-white/70 hover:text-destructive hover:bg-destructive/10 transition"
          >
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0">
        <header className="glass border-b border-white/40 sticky top-0 z-30 md:hidden">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="font-heading font-semibold">{title}</div>
            <button
              onClick={() => nav("/staff/admin")}
              className="text-xs text-brand"
            >
              Menu
            </button>
          </div>
        </header>

        {pinMissing && (
          <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-6 py-3 text-sm flex items-center gap-3">
            <ShieldAlert size={14} className="shrink-0 text-amber-700" />
            <span className="flex-1">
              You haven't set an admin PIN yet — destructive actions (free session, reveal
              phone numbers) will be unavailable until you do.
            </span>
            <button
              onClick={() => nav("/staff/account")}
              className="text-amber-900 underline font-medium whitespace-nowrap"
              data-testid="pin-banner-cta"
            >
              Set PIN →
            </button>
          </div>
        )}

        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          {title && (
            <h1 className="font-heading text-2xl sm:text-3xl font-semibold tracking-tight mb-6 hidden md:block">
              {title}
            </h1>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}

function NavItem({ to, icon: Icon, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-2 px-3 py-2 rounded-lg transition ${
          isActive
            ? "bg-brand text-white shadow-soft"
            : "text-white/70 hover:text-white hover:bg-white/5"
        }`
      }
    >
      <Icon size={13} />
      {label}
    </NavLink>
  );
}
