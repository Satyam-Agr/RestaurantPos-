import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Phone, UtensilsCrossed, ArrowRight, ShieldAlert, Loader2, CheckCircle2 } from "lucide-react";
import { loadCustomer, saveCustomer } from "../lib/session";
import { customerLogin } from "../lib/api";
import { toast } from "sonner";
import { debugStore } from "../lib/debugStore";
import TablePicker from "./TablePicker";

export default function CustomerEntry() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const qr = params.get("qr") || "";

  const cached = loadCustomer();
  const [phone, setPhone] = useState(cached?.phoneNumber || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [autoRedirected, setAutoRedirected] = useState(false);

  // If we already have a valid cached customer token, skip straight to table access
  useEffect(() => {
    if (!qr) return; // TablePicker will render below
    if (cached?.customerToken) {
      setAutoRedirected(true);
      const t = setTimeout(() => nav(`/table?qr=${encodeURIComponent(qr)}`), 700);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qr]);

  // No QR token → show the temporary table picker
  if (!qr) return <TablePicker />;

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!/^[6-9]\d{9}$/.test(phone.trim())) {
      setErr("Enter a valid 10-digit Indian mobile number (starting with 6-9).");
      return;
    }
    setBusy(true);
    try {
      const data = await customerLogin(phone.trim());
      // Log the raw response so we can spot field-name mismatches easily.
      debugStore.push({
        type: "info",
        source: "auth",
        message: "customerLogin response",
        detail: data,
      });
      const saved = saveCustomer(data);
      if (!saved.customerToken) {
        const err =
          "Backend returned no customer token. Expected field `customerToken` (or token/accessToken/jwt). Got: " +
          Object.keys(data || {}).join(", ");
        debugStore.push({ type: "error", source: "auth", message: err, detail: data });
        setErr(err);
        toast.error("Login failed — see Debug console for details");
        return;
      }
      toast.success("Welcome!");
      nav(`/table?qr=${encodeURIComponent(qr)}`);
    } catch (e) {
      setErr(e.message);
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url(https://images.unsplash.com/photo-1728501650832-57bafbf10a37?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MjJ8MHwxfHNlYXJjaHw0fHx3YXJtJTIwY296eSUyMHJlc3RhdXJhbnQlMjBpbnRlcmlvcnxlbnwwfHx8fDE3ODM0MTI0MTJ8MA&ixlib=rb-4.1.0&q=85)",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#2C362F]/40 via-[#2C362F]/60 to-[#2C362F]/85" />

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-8 animate-fadeUp">
            <div className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full glass text-ink text-xs tracking-[0.3em] uppercase font-medium">
              <UtensilsCrossed size={14} className="text-brand" />
              Trattoria
            </div>
            <h1 className="font-heading text-4xl sm:text-5xl font-semibold text-white tracking-tight">
              {autoRedirected ? "Welcome back" : "Welcome to your table"}
            </h1>
            <p className="text-white/70 mt-3 leading-relaxed">
              {autoRedirected
                ? "Taking you to your table…"
                : "Enter your mobile number to start or join the order for this table."}
            </p>
          </div>

          {autoRedirected ? (
            <div className="glass rounded-3xl p-8 shadow-lift animate-fadeUp flex flex-col items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-successc/20 grid place-items-center">
                <CheckCircle2 className="text-successc" size={24} />
              </div>
              <div className="text-center">
                <div className="font-heading text-lg font-semibold">
                  Signed in as +91 {cached?.phoneNumber}
                </div>
                <div className="text-sm text-ink2 mt-1">Redirecting…</div>
              </div>
              <Loader2 className="animate-spin text-brand mt-2" size={20} />
            </div>
          ) : (
            <form
              onSubmit={submit}
              className="glass rounded-3xl p-6 sm:p-8 shadow-lift animate-fadeUp"
              data-testid="entry-form"
            >
              <label className="block text-xs uppercase tracking-[0.2em] font-semibold text-ink2 mb-2">
                Mobile Number
              </label>
              <div className="flex items-center gap-2 bg-bg border border-bg2 rounded-xl px-3 py-3 focus-within:ring-2 focus-within:ring-brand transition">
                <Phone size={18} className="text-brand" />
                <span className="text-ink2 font-mono">+91</span>
                <input
                  data-testid="phone-input"
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                  placeholder="98765 43210"
                  inputMode="numeric"
                  autoFocus
                  className="flex-1 bg-transparent outline-none text-ink font-mono text-lg tracking-wider"
                />
              </div>

              <p className="mt-2 text-[11px] text-ink2">
                We'll remember you for 30 days — no OTP, no password.
              </p>

              {err && (
                <div
                  data-testid="entry-error"
                  className="mt-4 flex items-start gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2"
                >
                  <ShieldAlert size={16} className="mt-0.5 shrink-0" />
                  <span>{err}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={!qr || busy}
                data-testid="entry-continue-btn"
                className="mt-6 w-full flex items-center justify-center gap-2 rounded-full bg-brand hover:bg-brandHover disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-3.5 shadow-lift hover:-translate-y-0.5 transition-all"
              >
                {busy ? <Loader2 className="animate-spin" size={18} /> : <ArrowRight size={18} />}
                Continue
              </button>

              <p className="mt-4 text-center text-xs text-ink2">
                Staff?{" "}
                <a
                  href="/staff/login"
                  data-testid="entry-staff-link"
                  className="text-brand font-medium hover:underline"
                >
                  Sign in here
                </a>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
