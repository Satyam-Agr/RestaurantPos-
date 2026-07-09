import React, { useEffect, useMemo, useState } from "react";
import AdminShell from "../components/AdminShell";
import {
  adminMenuCategories, adminCreateCategory, adminUpdateCategory, adminDeleteCategory,
  adminMenuItems, adminCreateItem, adminUpdateItem, adminDeleteItem,
} from "../lib/api";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Loader2, X, Save, ImageIcon, ToggleLeft, ToggleRight } from "lucide-react";

export default function AdminMenuPage() {
  const [cats, setCats] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editCat, setEditCat] = useState(null);
  const [editItem, setEditItem] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [c, i] = await Promise.all([adminMenuCategories(), adminMenuItems()]);
      setCats(Array.isArray(c) ? c : []);
      setItems(Array.isArray(i) ? i : []);
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const byCat = useMemo(() => {
    const map = {};
    items.forEach((it) => { (map[it.categoryId] ||= []).push(it); });
    return map;
  }, [items]);

  const toggleAvail = async (it) => {
    try { await adminUpdateItem(it.id, { available: !it.available }); load(); }
    catch (e) { toast.error(e.message); }
  };

  const del = async (kind, id, name) => {
    if (!window.confirm(`Delete ${kind} "${name}"?`)) return;
    try {
      if (kind === "category") await adminDeleteCategory(id);
      else await adminDeleteItem(id);
      toast.success("Deleted");
      load();
    } catch (e) {
      if (e.status === 409) toast.error(e.message || "In use — cannot delete.");
      else toast.error(e.message);
    }
  };

  return (
    <AdminShell title="Menu">
      <div className="flex justify-end mb-4 gap-2">
        <button onClick={() => setEditCat({})} data-testid="new-category-btn" className="flex items-center gap-1.5 rounded-full border border-bg2 hover:border-brand hover:text-brand text-sm px-4 py-2 transition"><Plus size={12} />Category</button>
        <button onClick={() => setEditItem({ available: true })} data-testid="new-item-btn" className="flex items-center gap-1.5 rounded-full bg-brand hover:bg-brandHover text-white text-sm px-4 py-2 shadow-soft transition"><Plus size={12} />New Item</button>
      </div>

      {loading ? <Loader2 className="animate-spin text-brand mx-auto mt-10" size={24} /> : (
        <div className="space-y-5">
          {cats.map((c) => (
            <div key={c.id} className="bg-surface border border-bg2 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-bg border-b border-bg2">
                <h3 className="font-heading font-semibold flex-1">{c.name}</h3>
                <button onClick={() => setEditCat(c)} className="text-xs text-ink2 hover:text-brand p-1" data-testid={`edit-cat-${c.id}`}><Edit2 size={12} /></button>
                <button onClick={() => del("category", c.id, c.name)} className="text-xs text-ink2 hover:text-destructive p-1"><Trash2 size={12} /></button>
              </div>
              <div className="divide-y divide-bg2">
                {(byCat[c.id] || []).map((it) => (
                  <div key={it.id} className={`flex items-center gap-3 px-4 py-2 ${!it.available ? "opacity-60" : ""}`} data-testid={`item-${it.id}`}>
                    <div className="h-10 w-10 rounded-lg bg-bg overflow-hidden shrink-0">
                      {it.imageUrl ? <img src={it.imageUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-ink2"><ImageIcon size={14} /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{it.name}</div>
                      <div className="text-xs text-ink2 font-mono">₹{Number(it.price).toFixed(2)}</div>
                    </div>
                    <button onClick={() => toggleAvail(it)} title={it.available ? "Available" : "Unavailable"} data-testid={`toggle-${it.id}`} className={it.available ? "text-successc" : "text-ink2"}>
                      {it.available ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    </button>
                    <button onClick={() => setEditItem(it)} className="text-ink2 hover:text-brand p-1" data-testid={`edit-item-${it.id}`}><Edit2 size={12} /></button>
                    <button onClick={() => del("item", it.id, it.name)} className="text-ink2 hover:text-destructive p-1"><Trash2 size={12} /></button>
                  </div>
                ))}
                {!byCat[c.id]?.length && <div className="text-center text-ink2 text-sm py-3 italic">No items yet.</div>}
              </div>
            </div>
          ))}
          {!cats.length && <div className="text-center py-10 text-ink2 border border-dashed border-bg2 rounded-2xl">No categories. Create one to start.</div>}
        </div>
      )}

      {editCat && <CategoryModal cat={editCat} onClose={() => setEditCat(null)} onDone={() => { setEditCat(null); load(); }} />}
      {editItem && <ItemModal item={editItem} cats={cats} onClose={() => setEditItem(null)} onDone={() => { setEditItem(null); load(); }} />}
    </AdminShell>
  );
}

function CategoryModal({ cat, onClose, onDone }) {
  const [name, setName] = useState(cat.name || "");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      if (cat.id) await adminUpdateCategory(cat.id, { name });
      else await adminCreateCategory({ name });
      toast.success(cat.id ? "Updated" : "Created");
      onDone();
    } catch (e2) { toast.error(e2.message); }
    finally { setBusy(false); }
  };
  return <ModalShell title={cat.id ? "Edit Category" : "New Category"} onClose={onClose}>
    <form onSubmit={submit}>
      <Field label="Category name" value={name} onChange={setName} required autoFocus />
      <SubmitBar onClose={onClose} busy={busy} />
    </form>
  </ModalShell>;
}

function ItemModal({ item, cats, onClose, onDone }) {
  const [f, setF] = useState({
    name: item.name || "", price: item.price || "", description: item.description || "",
    imageUrl: item.imageUrl || "", categoryId: item.categoryId || cats[0]?.id, available: item.available !== false,
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF({ ...f, [k]: v });
  const submit = async (e) => {
    e.preventDefault();
    if (!f.name.trim() || !f.categoryId) return toast.error("Name and category required");
    setBusy(true);
    try {
      const body = { ...f, price: Number(f.price) };
      if (item.id) await adminUpdateItem(item.id, body);
      else await adminCreateItem(body);
      toast.success(item.id ? "Updated" : "Created");
      onDone();
    } catch (e2) { toast.error(e2.message); }
    finally { setBusy(false); }
  };
  return <ModalShell title={item.id ? "Edit Item" : "New Item"} onClose={onClose}>
    <form onSubmit={submit} className="space-y-3">
      <Field label="Name" value={f.name} onChange={set("name")} required autoFocus />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Price (₹)" type="number" value={f.price} onChange={set("price")} required />
        <label className="block">
          <span className="text-[10px] uppercase tracking-widest text-ink2 font-semibold">Category *</span>
          <select value={f.categoryId} onChange={(e) => set("categoryId")(Number(e.target.value))} className="mt-1 w-full bg-bg border border-bg2 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand">
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
      </div>
      <Field label="Description" value={f.description} onChange={set("description")} />
      <Field label="Image URL" value={f.imageUrl} onChange={set("imageUrl")} />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.available} onChange={(e) => set("available")(e.target.checked)} />Available</label>
      <SubmitBar onClose={onClose} busy={busy} />
    </form>
  </ModalShell>;
}

function ModalShell({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/50 grid place-items-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-surface rounded-3xl max-w-md w-full p-6 shadow-lift max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4"><h3 className="font-heading text-lg font-semibold">{title}</h3><button onClick={onClose}><X size={16} /></button></div>
        {children}
      </div>
    </div>
  );
}
function Field({ label, value, onChange, type, required, autoFocus }) {
  return <label className="block"><span className="text-[10px] uppercase tracking-widest text-ink2 font-semibold">{label} {required && <span className="text-destructive">*</span>}</span><input type={type || "text"} value={value} onChange={(e) => onChange(e.target.value)} autoFocus={autoFocus} className="mt-1 w-full bg-bg border border-bg2 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand" /></label>;
}
function SubmitBar({ onClose, busy }) {
  return <div className="mt-5 flex gap-2 justify-end">
    <button type="button" onClick={onClose} className="rounded-full border border-bg2 px-4 py-2 text-sm">Cancel</button>
    <button type="submit" disabled={busy} data-testid="modal-save" className="flex items-center gap-1.5 rounded-full bg-brand hover:bg-brandHover text-white text-sm px-4 py-2 shadow-lift disabled:opacity-50">{busy ? <Loader2 className="animate-spin" size={12} /> : <Save size={12} />}Save</button>
  </div>;
}
