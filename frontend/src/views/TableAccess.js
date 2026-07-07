import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createSession, getSessionStatus, joinSession, customerLogout } from "../lib/api";
import { saveSession, loadCustomer, clearCustomer, clearSession } from "../lib/session";
import { toast } from "sonner";
import { KeyRound, Sparkles, Users, ArrowRight, Loader2, LogOut } from "lucide-react";

export default function TableAccess() {
  const [params] = useSearchParams();
  const qr = params.get("qr") || "";
  const nav = useNavigate();
  const [status, setStatus] = useState(null); // { tableNumber, activeSessionExists }
  const [loading, setLoading] = useState(true);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  const customer = loadCustomer();

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await customerLogout().catch(() => {});
    } finally {
      clearCustomer();
      clearSession();
      toast.success("Signed out");
      // Stay on this page but force phone-entry flow to re-run
      nav(`/?qr=${encodeURIComponent(qr)}`, { replace: true });
      // Reload to guarantee no stale in-memory state
      setTimeout(() => window.location.reload(), 50);
    }
  };

  useEffect(() => {
    if (!qr) {
      nav("/");
      return;
    }
    getSessionStatus(qr)
      .then(setStatus)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [qr, nav]);

  const goToOrder = (sess) => {
    saveSession({ ...sess, qrToken: qr });
    toast.success(`Joined table ${sess.tableNumber}`);
    nav("/order");
  };

  const handle401 = (e) => {
    if (e.status === 401) {
      clearCustomer();
      toast.error("Please sign in again");
      nav(`/?qr=${encodeURIComponent(qr)}`);
      return true;
    }
    return false;
  };

  const handleCreate = async () => {
    if (!loadCustomer()) {
      nav(`/?qr=${encodeURIComponent(qr)}`);
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const s = await createSession(qr);
      goToOrder(s);
    } catch (e) {
      if (handle401(e)) return;
      setErr(e.message);
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(pin)) {
      setErr("Enter the 4-digit PIN");
      return;
    }
    if (!loadCustomer()) {
      nav(`/?qr=${encodeURIComponent(qr)}`);
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const s = await joinSession(qr, pin);
      goToOrder(s);
    } catch (e) {
      if (handle401(e)) return;
      setErr(e.message);
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="animate-spin text-brand" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-10">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8 animate-fadeUp">
          <div className="inline-block px-3 py-1 rounded-full bg-brand/10 text-brand text-xs uppercase tracking-[0.25em] font-semibold">
            Table {status?.tableNumber || "—"}
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-semibold mt-4 tracking-tight">
            {status?.activeSessionExists ? "Join your table" : "Start your table"}
          </h1>
          <p className="text-ink2 mt-2">
            {status?.activeSessionExists
              ? "Someone already opened an order at this table. Enter the PIN to join them."
              : "You are the first to arrive. Create a new shared order list."}
          </p>
        </div>

        {status?.activeSessionExists ? (
          <form
            onSubmit={handleJoin}
            data-testid="join-form"
            className="bg-surface rounded-3xl p-6 shadow-soft border border-bg2 animate-fadeUp"
          >
            <div className="flex items-center gap-2 text-ink2 mb-3">
              <KeyRound size={16} className="text-brand" />
              <span className="text-xs uppercase tracking-[0.2em] font-semibold">
                Table PIN
              </span>
            </div>
            <input
              data-testid="pin-input"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="0000"
              inputMode="numeric"
              className="w-full bg-bg border border-bg2 rounded-xl px-4 py-4 text-center text-3xl font-mono tracking-[0.5em] outline-none focus:ring-2 focus:ring-brand"
            />
            {err && (
              <p className="mt-3 text-sm text-destructive" data-testid="join-error">
                {err}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              data-testid="join-table-btn"
              className="mt-5 w-full flex items-center justify-center gap-2 rounded-full bg-brand hover:bg-brandHover text-white font-medium py-3.5 shadow-lift hover:-translate-y-0.5 transition-all disabled:opacity-50"
            >
              {busy ? <Loader2 className="animate-spin" size={18} /> : <Users size={18} />}
              Join Order List
            </button>
          </form>
        ) : (
          <div
            data-testid="create-panel"
            className="bg-surface rounded-3xl p-6 shadow-soft border border-bg2 animate-fadeUp"
          >
            <div className="flex items-center gap-2 text-ink2 mb-3">
              <Sparkles size={16} className="text-brand" />
              <span className="text-xs uppercase tracking-[0.2em] font-semibold">
                Fresh table
              </span>
            </div>
            <p className="text-ink leading-relaxed">
              We'll generate a 4-digit PIN. Share it with anyone else at your table so they
              can join the same order.
            </p>
            {err && (
              <p className="mt-3 text-sm text-destructive" data-testid="create-error">
                {err}
              </p>
            )}
            <button
              onClick={handleCreate}
              disabled={busy}
              data-testid="create-table-btn"
              className="mt-5 w-full flex items-center justify-center gap-2 rounded-full bg-brand hover:bg-brandHover text-white font-medium py-3.5 shadow-lift hover:-translate-y-0.5 transition-all disabled:opacity-50"
            >
              {busy ? <Loader2 className="animate-spin" size={18} /> : <ArrowRight size={18} />}
              Create Order List
            </button>
          </div>
        )}

        {/* Signed-in badge + sign-out link */}
        {customer?.phoneNumber && (
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-ink2 animate-fadeUp">
            <span>
              Signed in as{" "}
              <span className="font-mono text-ink font-semibold">
                +91 {customer.phoneNumber}
              </span>
            </span>
            <span className="text-ink2/40">·</span>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              data-testid="table-access-signout"
              className="inline-flex items-center gap-1 text-destructive hover:underline disabled:opacity-50"
            >
              {signingOut ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <LogOut size={11} />
              )}
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
