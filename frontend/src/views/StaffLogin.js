import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../lib/api";
import { toast } from "sonner";
import { LogIn, Lock, User, Loader2, UtensilsCrossed } from "lucide-react";

const ROLE_HOME = {
  WAITER: "/staff/waiter",
  KITCHEN: "/staff/kitchen",
  CASHIER: "/staff/cashier",
};

export default function StaffLogin() {
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!username || !password) return;
    setBusy(true);
    setErr("");
    try {
      const data = await login(username, password);
      localStorage.setItem("staff_token", data.token);
      localStorage.setItem(
        "staff_info",
        JSON.stringify({ name: data.name, role: data.role })
      );
      toast.success(`Welcome, ${data.name}`);
      const dest = ROLE_HOME[data.role];
      if (!dest) {
        setErr(`Unknown role: ${data.role}`);
        return;
      }
      nav(dest);
    } catch (e) {
      setErr(e.message);
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
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

      <div className="relative z-10 min-h-screen grid place-items-center px-4">
        <form
          onSubmit={submit}
          data-testid="staff-login-form"
          className="w-full max-w-md glass rounded-3xl p-8 shadow-lift animate-fadeUp"
        >
          <div className="flex items-center gap-2 mb-6">
            <div className="h-10 w-10 rounded-2xl bg-brand grid place-items-center text-white">
              <UtensilsCrossed size={18} />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-ink2 font-semibold">
                Staff Portal
              </div>
              <div className="font-heading text-xl font-semibold">Trattoria</div>
            </div>
          </div>

          <h1 className="font-heading text-3xl font-semibold tracking-tight">Sign in</h1>
          <p className="text-ink2 mt-1">Enter your staff credentials to continue.</p>

          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-2 bg-bg border border-bg2 rounded-xl px-3 py-3 focus-within:ring-2 focus-within:ring-brand transition">
              <User size={16} className="text-ink2" />
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                autoComplete="username"
                data-testid="username-input"
                className="flex-1 bg-transparent outline-none"
              />
            </div>
            <div className="flex items-center gap-2 bg-bg border border-bg2 rounded-xl px-3 py-3 focus-within:ring-2 focus-within:ring-brand transition">
              <Lock size={16} className="text-ink2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete="current-password"
                data-testid="password-input"
                className="flex-1 bg-transparent outline-none"
              />
            </div>
          </div>

          {err && (
            <div
              data-testid="login-error"
              className="mt-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2"
            >
              {err}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            data-testid="staff-login-btn"
            className="mt-6 w-full flex items-center justify-center gap-2 rounded-full bg-brand hover:bg-brandHover text-white font-medium py-3.5 shadow-lift hover:-translate-y-0.5 transition-all disabled:opacity-50"
          >
            {busy ? <Loader2 className="animate-spin" size={18} /> : <LogIn size={18} />}
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
