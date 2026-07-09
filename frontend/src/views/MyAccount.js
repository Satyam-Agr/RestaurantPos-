import React, { useEffect, useState } from "react";
import StaffShell from "../components/StaffShell";
import { getMyProfile, updateMyProfile, changeMyPassword, adminSetPin } from "../lib/api";
import { toast } from "sonner";
import {
  Lock,
  Loader2,
  Save,
  KeyRound,
  ShieldCheck,
  Pencil,
  Mail,
  Phone,
  MapPin,
  AtSign,
  BadgeCheck,
  Eye,
} from "lucide-react";

const TABS = [
  { id: "profile", label: "Profile", icon: Eye },
  { id: "edit", label: "Edit Details", icon: Pencil },
  { id: "security", label: "Security", icon: ShieldCheck },
];

export default function MyAccount() {
  const [me, setMe] = useState(null);
  const [tab, setTab] = useState("profile");

  useEffect(() => {
    getMyProfile()
      .then(setMe)
      .catch((e) => toast.error(e.message));
  }, []);

  return (
    <StaffShell title="My Account" testId="my-account">
      <div className="max-w-3xl mx-auto">
        {/* Tab strip */}
        <div className="flex gap-1 mb-6 border-b border-bg2">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                data-testid={`account-tab-${t.id}`}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
                  active
                    ? "border-brand text-brand"
                    : "border-transparent text-ink2 hover:text-ink"
                }`}
              >
                <Icon size={13} />
                {t.label}
              </button>
            );
          })}
        </div>

        {!me ? (
          <div className="grid place-items-center py-16">
            <Loader2 className="animate-spin text-brand" size={24} />
          </div>
        ) : tab === "profile" ? (
          <ProfileView me={me} onEdit={() => setTab("edit")} />
        ) : tab === "edit" ? (
          <EditProfile me={me} onSaved={(u) => setMe(u)} onDone={() => setTab("profile")} />
        ) : (
          <Security isAdmin={me.role === "ADMIN"} />
        )}
      </div>
    </StaffShell>
  );
}

// ---------- Profile (view) ----------
function ProfileView({ me, onEdit }) {
  const initials = (me.name || me.username || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="animate-fadeUp">
      <div className="bg-surface border border-bg2 rounded-2xl p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-16 w-16 rounded-2xl bg-brand text-white grid place-items-center font-heading text-2xl font-bold shadow-soft">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-heading text-2xl font-semibold truncate">{me.name}</div>
            <div className="flex items-center gap-1.5 text-xs text-ink2">
              <BadgeCheck size={12} className="text-brand" />
              <span className="uppercase tracking-widest font-semibold">{me.role}</span>
              <span className="text-ink2/40">·</span>
              <span className="font-mono">@{me.username}</span>
            </div>
          </div>
          <button
            onClick={onEdit}
            data-testid="profile-edit-jump"
            className="flex items-center gap-1.5 rounded-full bg-brand hover:bg-brandHover text-white text-sm px-4 py-2 shadow-soft transition"
          >
            <Pencil size={12} />
            Edit
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InfoRow icon={Mail} label="Email" value={me.email} />
          <InfoRow icon={Phone} label="Contact" value={me.contactNumber} />
          <InfoRow icon={AtSign} label="Username" value={`@${me.username}`} />
          <InfoRow icon={MapPin} label="Address" value={me.address} full />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, full }) {
  return (
    <div className={`bg-bg rounded-xl border border-bg2 p-3 ${full ? "sm:col-span-2" : ""}`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-ink2 font-semibold">
        <Icon size={11} />
        {label}
      </div>
      <div className={`mt-0.5 text-sm ${value ? "text-ink" : "text-ink2 italic"}`}>
        {value || "Not set"}
      </div>
    </div>
  );
}

// ---------- Edit Profile ----------
function EditProfile({ me, onSaved, onDone }) {
  const [form, setForm] = useState({
    name: me.name || "",
    username: me.username || "",
    email: me.email || "",
    contactNumber: me.contactNumber || "",
    address: me.address || "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const set = (k) => (v) => setForm({ ...form, [k]: v });

  const save = async (e) => {
    e.preventDefault();
    setErr("");
    if (!form.name.trim()) return setErr("Full name is required.");
    if (!form.username.trim()) return setErr("Username is required.");
    setBusy(true);
    try {
      const updated = await updateMyProfile(form);
      onSaved(updated);
      // If username changed, keep the local staff_info in sync so header/sidebar update.
      const info = JSON.parse(localStorage.getItem("staff_info") || "null");
      if (info) {
        localStorage.setItem(
          "staff_info",
          JSON.stringify({ ...info, name: updated.name })
        );
      }
      toast.success("Profile updated");
      onDone();
    } catch (e2) {
      if (e2.status === 409) setErr("That username is already taken. Try another.");
      else setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="bg-surface border border-bg2 rounded-2xl p-6 animate-fadeUp">
      <div className="flex items-center gap-2 mb-1">
        <Pencil size={16} className="text-brand" />
        <h2 className="font-heading text-lg font-semibold">Edit your details</h2>
      </div>
      <p className="text-xs text-ink2 mb-5">
        Changing your username updates your login handle immediately. Role is set by your
        admin and can't be changed here.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Full name" required value={form.name} onChange={set("name")} testId="edit-name" />
        <Field label="Username" required value={form.username} onChange={set("username")} testId="edit-username" />
        <Field label="Email" type="email" value={form.email} onChange={set("email")} testId="edit-email" />
        <Field label="Contact number" value={form.contactNumber} onChange={set("contactNumber")} testId="edit-contact" />
        <div className="sm:col-span-2">
          <Field label="Address" value={form.address} onChange={set("address")} testId="edit-address" />
        </div>
        <Field label="Role (read-only)" value={me.role} disabled />
      </div>
      {err && (
        <div className="mt-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">
          {err}
        </div>
      )}
      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={onDone}
          className="rounded-full border border-bg2 hover:bg-bg2/60 px-5 py-2.5 text-sm transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy}
          data-testid="profile-save"
          className="flex items-center gap-2 rounded-full bg-brand hover:bg-brandHover text-white font-medium px-5 py-2.5 shadow-lift transition disabled:opacity-50"
        >
          {busy ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
          Save changes
        </button>
      </div>
    </form>
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

// ---------- Security ----------
function Security({ isAdmin }) {
  return (
    <div className="space-y-5 animate-fadeUp">
      <PasswordForm />
      {isAdmin && <AdminPinForm />}
    </div>
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
    <form onSubmit={submit} className="bg-surface border border-bg2 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-1">
        <Lock size={16} className="text-brand" />
        <h2 className="font-heading text-lg font-semibold">Change password</h2>
      </div>
      <p className="text-xs text-ink2 mb-4">
        Only you can change your password — even admins can't reset it for you.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Current password" type="password" value={current} onChange={setCurrent} required testId="pwd-current" />
        <Field label="New password" type="password" value={next} onChange={setNext} required testId="pwd-new" />
        <Field label="Confirm new password" type="password" value={confirm} onChange={setConfirm} required testId="pwd-confirm" />
      </div>
      {err && (
        <div className="mt-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">
          {err}
        </div>
      )}
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
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!currentPassword) return setErr("Enter your current password.");
    if (!/^\d{4,6}$/.test(newPin)) return setErr("PIN must be 4–6 digits.");
    if (newPin !== confirm) return setErr("PINs do not match.");
    setBusy(true);
    try {
      await adminSetPin(currentPassword, newPin);
      toast.success("Admin PIN updated");
      setCurrentPassword("");
      setNewPin("");
      setConfirm("");
    } catch (e2) {
      if (e2.status === 401) setErr("Incorrect password.");
      else setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-surface border border-bg2 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck size={16} className="text-brand" />
        <h2 className="font-heading text-lg font-semibold">Admin PIN</h2>
      </div>
      <p className="text-xs text-ink2 mb-4">
        Required for destructive actions like force-freeing a table or revealing customer
        phone numbers. Re-verified every time — never cached.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Current password" type="password" value={currentPassword} onChange={setCurrentPassword} required testId="pin-currentpwd" />
        <Field label="New PIN (4–6 digits)" type="password" value={newPin} onChange={(v) => setNewPin(v.replace(/\D/g, "").slice(0, 6))} required testId="pin-new" />
        <Field label="Confirm new PIN" type="password" value={confirm} onChange={(v) => setConfirm(v.replace(/\D/g, "").slice(0, 6))} required testId="pin-confirm" />
      </div>
      {err && (
        <div className="mt-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">
          {err}
        </div>
      )}
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
