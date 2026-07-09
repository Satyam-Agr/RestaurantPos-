import React from "react";
import { useNavigate } from "react-router-dom";
import { LayoutDashboard, UtensilsCrossed, ArrowRight, ShieldCheck, LogOut } from "lucide-react";
import { toast } from "sonner";

export default function AdminModeSelect() {
  const nav = useNavigate();
  const staff = JSON.parse(localStorage.getItem("staff_info") || "null");

  const logout = () => {
    localStorage.removeItem("staff_token");
    localStorage.removeItem("staff_info");
    toast.success("Signed out");
    nav("/staff/login");
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url(https://images.unsplash.com/photo-1728501650832-57bafbf10a37?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MjJ8MHwxfHNlYXJjaHw0fHx3YXJtJTIwY296eSUyMHJlc3RhdXJhbnQlMjBpbnRlcmlvcnxlbnwwfHx8fDE3ODM0MTI0MTJ8MA&ixlib=rb-4.1.0&q=85)",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-ink/70 to-ink/90" />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3 px-4 py-1.5 rounded-full glass text-ink text-xs tracking-[0.3em] uppercase font-medium">
            <ShieldCheck size={12} className="text-brand" />
            Admin
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl font-semibold text-white tracking-tight">
            Welcome, {staff?.name || "Admin"}
          </h1>
          <p className="text-white/70 mt-2">Choose how you want to work today.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl animate-fadeUp">
          <ModeCard
            title="Management Console"
            desc="Menu, staff, tables, analytics, bill history."
            icon={LayoutDashboard}
            onClick={() => nav("/staff/admin")}
            testId="mode-management"
            primary
          />
          <ModeCard
            title="Operate"
            desc="Jump into the floor. Take orders, generate bills."
            icon={UtensilsCrossed}
            onClick={() => nav("/staff/admin/operate")}
            testId="mode-operate"
          />
        </div>

        <button
          onClick={logout}
          className="mt-8 text-xs text-white/60 hover:text-white flex items-center gap-1 transition"
          data-testid="mode-logout"
        >
          <LogOut size={12} />
          Sign out
        </button>
      </div>
    </div>
  );
}

function ModeCard({ title, desc, icon: Icon, onClick, testId, primary }) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className={`text-left glass rounded-3xl p-6 shadow-lift hover:-translate-y-0.5 transition-all group border ${
        primary ? "border-brand/40" : "border-white/20"
      }`}
    >
      <div className={`inline-grid place-items-center h-11 w-11 rounded-2xl mb-4 ${primary ? "bg-brand text-white" : "bg-ink text-white"}`}>
        <Icon size={18} />
      </div>
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xl font-semibold text-ink">{title}</h2>
        <ArrowRight size={16} className="text-ink2 group-hover:text-brand transition" />
      </div>
      <p className="text-sm text-ink2 mt-1 leading-relaxed">{desc}</p>
    </button>
  );
}
