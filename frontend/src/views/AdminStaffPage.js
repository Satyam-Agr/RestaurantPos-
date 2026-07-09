import React, { useEffect, useState } from "react";
import AdminShell from "../components/AdminShell";
import { adminStaffList, adminCreateStaff, adminUpdateStaff } from "../lib/api";
import { toast } from "sonner";
import { Plus, Edit2, Loader2, X, Save, User, ShieldCheck, ShieldOff } from "lucide-react";

const ROLES = ["WAITER", "KITCHEN", "CASHIER", "ADMIN"];

export default function AdminStaffPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState(null);

  const load = async () => {
    setLoading(true);
    try { setList(await adminStaffList()); } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const toggleActive = async (s) => {
    if (!window.confirm(`${s.active ? "Deactivate" : "Reactivate"} ${s.name}?`)) return;
    try { await adminUpdateStaff(s.id, { active: !s.active }); load(); }
    catch (e) { toast.error(e.message); }
  };

  return (
    <AdminShell title="Staff">
      <div className="flex justify-end mb-4">
        <button onClick={() => setEdit({ role: "WAITER", active: true })} data-testid="new-staff-btn" className="flex items-center gap-1.5 rounded-full bg-brand hover:bg-brandHover text-white text-sm px-4 py-2 shadow-soft"><Plus size={12} />New Staff</button>
      </div>

      {loading ? <Loader2 className="animate-spin text-brand mx-auto mt-10" size={24} /> : (
        <div className="bg-surface border border-bg2 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg text-[10px] uppercase tracking-widest text-ink2 font-semibold">
              <tr><th className="text-left px-4 py-2">Name</th><th className="text-left px-4 py-2">Username</th><th className="text-left px-4 py-2">Role</th><th className="text-left px-4 py-2">Status</th><th className="text-right px-4 py-2">Actions</th></tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id} className="border-t border-bg2" data-testid={`staff-row-${s.id}`}>
                  <td className="px-4 py-2 font-medium">{s.name}</td>
                  <td className="px-4 py-2 font-mono text-xs">@{s.username}</td>
                  <td className="px-4 py-2 text-xs uppercase tracking-widest text-ink2">{s.role}</td>
                  <td className="px-4 py-2"><span className={`text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-full ${s.active ? "bg-successc/15 text-successc" : "bg-red-100 text-red-700"}`}>{s.active ? "Active" : "Inactive"}</span></td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => setEdit(s)} className="text-ink2 hover:text-brand p-1" data-testid={`edit-staff-${s.id}`}><Edit2 size={12} /></button>
                    <button onClick={() => toggleActive(s)} className={`p-1 ${s.active ? "text-ink2 hover:text-destructive" : "text-ink2 hover:text-successc"}`} data-testid={`toggle-staff-${s.id}`}>
                      {s.active ? <ShieldOff size={12} /> : <ShieldCheck size={12} />}
                    </button>
                  </td>
                </tr>
              ))}
              {!list.length && <tr><td colSpan={5} className="text-center py-8 text-ink2">No staff.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {edit && <StaffModal staff={edit} onClose={() => setEdit(null)} onDone={() => { setEdit(null); load(); }} />}
    </AdminShell>
  );
}

function StaffModal({ staff, onClose, onDone }) {
  const [f, setF] = useState({
    name: staff.name || "", username: staff.username || "", email: staff.email || "",
    contactNumber: staff.contactNumber || "", address: staff.address || "",
    role: staff.role || "WAITER", password: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const isNew = !staff.id;
  const set = (k) => (v) => setF({ ...f, [k]: v });

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!f.name.trim() || !f.username.trim()) return setErr("Name and username required");
    if (isNew && !f.password) return setErr("Initial password required");
    setBusy(true);
    try {
      if (isNew) await adminCreateStaff(f);
      else await adminUpdateStaff(staff.id, { name: f.name, username: f.username, email: f.email, contactNumber: f.contactNumber, address: f.address, role: f.role });
      toast.success(isNew ? "Staff created" : "Updated");
      onDone();
    } catch (e2) {
      if (e2.status === 409) setErr("Username already taken.");
      else setErr(e2.message);
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 grid place-items-center p-4" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-surface rounded-3xl max-w-md w-full p-6 shadow-lift max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4"><h3 className="font-heading text-lg font-semibold flex items-center gap-2"><User size={14} />{isNew ? "New Staff" : "Edit Staff"}</h3><button type="button" onClick={onClose}><X size={16} /></button></div>
        <div className="space-y-3">
          <Field label="Full name" value={f.name} onChange={set("name")} required />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Username" value={f.username} onChange={set("username")} required />
            <label className="block"><span className="text-[10px] uppercase tracking-widest text-ink2 font-semibold">Role *</span><select value={f.role} onChange={(e) => set("role")(e.target.value)} className="mt-1 w-full bg-bg border border-bg2 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand">{ROLES.map((r) => <option key={r} value={r}>{r}</option>)}</select></label>
          </div>
          {isNew && <Field label="Initial password" type="password" value={f.password} onChange={set("password")} required />}
          <Field label="Email" value={f.email} onChange={set("email")} />
          <Field label="Contact" value={f.contactNumber} onChange={set("contactNumber")} />
          <Field label="Address" value={f.address} onChange={set("address")} />
        </div>
        {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
        <div className="mt-5 flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="rounded-full border border-bg2 px-4 py-2 text-sm">Cancel</button>
          <button type="submit" disabled={busy} data-testid="staff-save" className="flex items-center gap-1.5 rounded-full bg-brand hover:bg-brandHover text-white text-sm px-4 py-2 shadow-lift disabled:opacity-50">{busy ? <Loader2 className="animate-spin" size={12} /> : <Save size={12} />}Save</button>
        </div>
        {!isNew && <p className="mt-3 text-xs text-ink2 italic text-center">Passwords are self-service — even admins can't reset them.</p>}
      </form>
    </div>
  );
}
function Field({ label, value, onChange, type, required }) {
  return <label className="block"><span className="text-[10px] uppercase tracking-widest text-ink2 font-semibold">{label} {required && <span className="text-destructive">*</span>}</span><input type={type || "text"} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full bg-bg border border-bg2 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand" /></label>;
}
