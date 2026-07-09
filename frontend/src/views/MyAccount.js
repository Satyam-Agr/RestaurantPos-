import React, { useEffect, useState } from "react";
import StaffShell from "../components/StaffShell";
import { getMyProfile, updateMyProfile, changeMyPassword } from "../lib/api";
import { toast } from "sonner";
import { User, Lock, Loader2, Save, KeyRound, ShieldCheck } from "lucide-react";

export default function MyAccount() {
  const [me, setMe] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getMyProfile()
      .then(setMe)
      .catch((e) => toast.error(e.message));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const updated = await updateMyProfile({
        name: me.name,
        email: me.email,
        contactNumber: me.contactNumber,
        address: me.address,
      });
      setMe(updated);
      toast.success("Profile saved");
    } catch (e2) {
      toast.error(e2.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <StaffShell title="My Account" testId="my-account">
      <div className="max-w-2xl mx-auto space-y-5">
        {!me ? (
          <div className="grid place-items-center py-16">
            <Loader2 className="animate-spin text-brand" size={24} />
          </div>
        ) : (
          <>
            {/* Profile */}
            <form onSubmit={save} className="bg-surface border border-bg2 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <User size={16} className="text-brand" />
                <h2 className="font-heading text-lg font-semibold">Profile</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Username (read-only)" value={me.username} disabled />
                <Field label="Role (read-only)" value={me.role} disabled />
                <Field
                  label="Full name"
                  required
                  value={me.name || ""}
                  onChange={(v) => setMe({ ...me, name: v })}
                  testId="profile-name"
                />
                <Field
                  label="Email"
                  type="email"
                  value={me.email || ""}
                  onChange={(v) => setMe({ ...me, email: v })}
                  testId="profile-email"
                />
                <Field
                  label="Contact number"
                  value={me.contactNumber || ""}
                  onChange={(v) => setMe({ ...me, contactNumber: v })}
                  testId="profile-contact"
                />
                <Field
                  label="Address"
                  value={me.address || ""}
                  onChange={(v) => setMe({ ...me, address: v })}
                  testId="profile-address"
                />
              </div>
              <button
                type="submit"
                disabled={busy || !me.name?.trim()}
                data-testid="profile-save"
                className="mt-5 flex items-center gap-2 rounded-full bg-brand hover:bg-brandHover text-white font-medium px-5 py-2.5 shadow-lift transition disabled:opacity-50"
              >
                {busy ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                Save profile
              </button>
            </form>

            <PasswordForm />

            {me.role === "ADMIN" && <AdminPinForm />}
          </>
        )}
      </div>
    </StaffShell>
  );
}

function Field({ label, value, onChange, disabled, type, required, testId }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-widest text-ink2 font-semibold">
        {label} {required && <span className="text-destructive">*</span>}
      </span>
      <input
        type={type || "text"}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        disabled={disabled}
        data-testid={testId}
        className={`mt-1 w-full bg-bg border border-bg2 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand ${
          disabled ? "opacity-60 cursor-not-allowed" : ""
        }`}
      />
    </label>
  );
}

function PasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (next.length < 6) return setErr("New password must be at least 6 characters.");
    if (next !== confirm) return setErr("New passwords do not match.");
    setBusy(true);
    try {
      await changeMyPassword({ currentPassword: current, newPassword: next });
      toast.success("Password updated");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-surface border border-bg2 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Lock size={16} className="text-brand" />
        <h2 className="font-heading text-lg font-semibold">Change password</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Current password" type="password" value={current} onChange={setCurrent} required testId="pwd-current" />
        <Field label="New password" type="password" value={next} onChange={setNext} required testId="pwd-new" />
        <Field label="Confirm new password" type="password" value={confirm} onChange={setConfirm} required testId="pwd-confirm" />
      </div>
      {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
      <button
        type="submit"
        disabled={busy}
        data-testid="pwd-save"
        className="mt-5 flex items-center gap-2 rounded-full bg-ink hover:bg-black text-white font-medium px-5 py-2.5 shadow-lift transition disabled:opacity-50"
      >
        {busy ? <Loader2 className="animate-spin" size={14} /> : <KeyRound size={14} />}
        Update password
      </button>
    </form>
  );
}

function AdminPinForm() {
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!/^\d{4,8}$/.test(pin)) return setErr("PIN must be 4–8 digits.");
    if (pin !== confirm) return setErr("PINs do not match.");
    setBusy(true);
    try {
      const { adminSetPin } = await import("../lib/api");
      await adminSetPin(pin);
      toast.success("Admin PIN updated");
      setPin("");
      setConfirm("");
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-surface border border-bg2 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck size={16} className="text-brand" />
        <h2 className="font-heading text-lg font-semibold">Admin PIN</h2>
      </div>
      <p className="text-xs text-ink2 mb-4">
        Required for destructive actions like force-freeing a table or revealing customer
        phone numbers. Never cached — you'll be prompted each time.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="New PIN (4–8 digits)" type="password" value={pin} onChange={setPin} testId="pin-new" />
        <Field label="Confirm new PIN" type="password" value={confirm} onChange={setConfirm} testId="pin-confirm" />
      </div>
      {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
      <button
        type="submit"
        disabled={busy}
        data-testid="pin-save"
        className="mt-5 flex items-center gap-2 rounded-full bg-brand hover:bg-brandHover text-white font-medium px-5 py-2.5 shadow-lift transition disabled:opacity-50"
      >
        {busy ? <Loader2 className="animate-spin" size={14} /> : <ShieldCheck size={14} />}
        Update PIN
      </button>
    </form>
  );
}
