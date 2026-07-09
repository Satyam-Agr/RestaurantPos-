import React from "react";
import AdminShell from "../components/AdminShell";
import { NavLink } from "react-router-dom";
import {
  LayoutGrid,
  UtensilsCrossed,
  Users,
  Receipt,
  BarChart3,
  ArrowRight,
  LayoutDashboard,
} from "lucide-react";

const TILES = [
  {
    to: "/staff/admin/tables",
    icon: LayoutGrid,
    title: "Live Tables",
    desc: "Watch every table in real time. Audit orders. Free stuck sessions.",
  },
  {
    to: "/staff/admin/menu",
    icon: UtensilsCrossed,
    title: "Menu",
    desc: "Add, edit and toggle availability of categories and dishes.",
  },
  {
    to: "/staff/admin/staff",
    icon: Users,
    title: "Staff",
    desc: "Create accounts, assign roles, deactivate departures.",
  },
  {
    to: "/staff/admin/roster",
    icon: LayoutDashboard,
    title: "Table Roster",
    desc: "Add tables, print QR codes, retire tables you no longer use.",
  },
  {
    to: "/staff/admin/bills",
    icon: Receipt,
    title: "Bill History",
    desc: "Every bill generated, filtered by date range.",
  },
  {
    to: "/staff/admin/analytics",
    icon: BarChart3,
    title: "Analytics",
    desc: "Revenue, top dishes, average time from placed to served.",
  },
];

export default function AdminOverview() {
  return (
    <AdminShell title="Overview">
      <p className="text-ink2 mb-6 max-w-2xl">
        Pick a section to manage. Every destructive action is PIN-gated — set your PIN under{" "}
        <NavLink to="/staff/account" className="text-brand hover:underline">
          My Account
        </NavLink>
        .
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TILES.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            data-testid={`overview-tile-${t.to.split("/").pop()}`}
            className="group bg-surface border border-bg2 rounded-2xl p-5 hover:-translate-y-0.5 hover:shadow-lift transition-all"
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-brand/10 text-brand grid place-items-center shrink-0">
                <t.icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-heading text-lg font-semibold">{t.title}</h2>
                  <ArrowRight size={14} className="text-ink2 group-hover:text-brand shrink-0" />
                </div>
                <p className="text-sm text-ink2 mt-1 leading-relaxed">{t.desc}</p>
              </div>
            </div>
          </NavLink>
        ))}
      </div>
    </AdminShell>
  );
}
