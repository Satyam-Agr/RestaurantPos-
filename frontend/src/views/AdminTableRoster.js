import React, { useEffect, useState } from "react";
import AdminShell from "../components/AdminShell";
import { adminTablesRoster, adminCreateTable, adminUpdateTable } from "../lib/api";
import { toast } from "sonner";
import { Plus, Edit2, Loader2, X, QrCode, Printer, Save, Ban } from "lucide-react";
import FilterTabs from "../components/FilterTabs";

export default function AdminTableRoster() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState(null);
  const [qr, setQr] = useState(null);
  const [filter, setFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    try { setRows(await adminTablesRoster()); } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const retire = async (r) => {
    if (!window.confirm(`Retire Table ${r.tableNumber}? It won't be usable until reactivated.`)) return;
    try { await adminUpdateTable(r.id, { retired: !r.retired }); load(); }
    catch (e) { toast.error(e.message); }
  };

  return (
    <AdminShell title="Table Roster">
      <div className="flex justify-between mb-4 items-center flex-wrap gap-2">
        <FilterTabs
          value={filter}
          onChange={setFilter}
          counts={{
            all: rows.length,
            live: rows.filter((r) => !r.retired).length,
            disabled: rows.filter((r) => r.retired).length,
          }}
        />
        <button onClick={() => setEdit({})} data-testid="new-table-btn" className="flex items-center gap-1.5 rounded-full bg-brand hover:bg-brandHover text-white text-sm px-4 py-2 shadow-soft"><Plus size={12} />New Table</button>
      </div>
      {loading ? <Loader2 className="animate-spin text-brand mx-auto mt-10" size={24} /> : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {rows.filter((r) => filter === "all" || (filter === "live" ? !r.retired : r.retired)).map((r) => (
            <div key={r.id} className={`bg-surface border ${r.retired ? "border-bg2 opacity-60" : "border-bg2"} rounded-2xl p-4`} data-testid={`roster-${r.id}`}>
              <div className="text-[10px] uppercase tracking-widest text-ink2 font-semibold">Table</div>
              <div className="font-heading text-3xl font-bold">{r.tableNumber}</div>
              {r.retired && <div className="text-[10px] uppercase tracking-widest bg-red-100 text-red-700 rounded-full px-2 py-0.5 font-semibold inline-block mt-1">Retired</div>}
              <div className="mt-3 flex items-center gap-1">
                <button onClick={() => setEdit(r)} className="text-xs text-ink2 hover:text-brand p-1" data-testid={`edit-${r.id}`}><Edit2 size={12} /></button>
                <button onClick={() => setQr(r)} className="text-xs text-ink2 hover:text-brand p-1" data-testid={`qr-${r.id}`}><QrCode size={12} /></button>
                <button onClick={() => retire(r)} className="text-xs text-ink2 hover:text-destructive p-1"><Ban size={12} /></button>
              </div>
            </div>
          ))}
          {!rows.length && <div className="col-span-full text-center py-10 text-ink2 border border-dashed border-bg2 rounded-2xl">No tables yet.</div>}
        </div>
      )}

      {edit && <EditModal row={edit} onClose={() => setEdit(null)} onDone={() => { setEdit(null); load(); }} />}
      {qr && <QRModal row={qr} onClose={() => setQr(null)} />}
    </AdminShell>
  );
}

function EditModal({ row, onClose, onDone }) {
  const [n, setN] = useState(row.tableNumber || "");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (row.id) await adminUpdateTable(row.id, { tableNumber: n });
      else await adminCreateTable(n);
      toast.success(row.id ? "Renamed" : "Created");
      onDone();
    } catch (e2) {
      if (e2.status === 409) toast.error("Table number already in use.");
      else toast.error(e2.message);
    } finally { setBusy(false); }
  };
  return <div className="fixed inset-0 z-[60] bg-black/50 grid place-items-center p-4" onClick={onClose}><form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-surface rounded-3xl max-w-sm w-full p-6 shadow-lift">
    <div className="flex justify-between mb-4"><h3 className="font-heading text-lg font-semibold">{row.id ? "Rename Table" : "New Table"}</h3><button type="button" onClick={onClose}><X size={16} /></button></div>
    <label className="block"><span className="text-[10px] uppercase tracking-widest text-ink2 font-semibold">Table Number *</span><input value={n} onChange={(e) => setN(e.target.value)} autoFocus className="mt-1 w-full bg-bg border border-bg2 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand" /></label>
    <button type="submit" disabled={busy || !n} data-testid="table-save" className="mt-5 w-full flex items-center justify-center gap-2 rounded-full bg-brand hover:bg-brandHover text-white py-2.5 disabled:opacity-50">{busy ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}Save</button>
  </form></div>;
}

function QRModal({ row, onClose }) {
  const url = `${window.location.origin}/?qr=${row.qrToken}`;
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(url)}`;
  return <div className="fixed inset-0 z-[60] bg-black/50 grid place-items-center p-4" onClick={onClose}>
    <div onClick={(e) => e.stopPropagation()} className="bg-surface rounded-3xl max-w-sm w-full p-6 shadow-lift receipt-print">
      <div className="flex justify-between mb-2 print:hidden"><h3 className="font-heading text-lg font-semibold">Table {row.tableNumber} QR</h3><button onClick={onClose}><X size={16} /></button></div>
      <div className="text-center py-4">
        <div className="text-[10px] uppercase tracking-widest text-ink2 font-semibold">Scan to order · Trattoria</div>
        <div className="font-heading text-3xl font-bold my-2">Table {row.tableNumber}</div>
        <img src={src} alt="QR" className="mx-auto rounded-xl" />
        <div className="mt-3 text-xs font-mono text-ink2 break-all">{url}</div>
      </div>
      <button onClick={() => window.print()} data-testid="qr-print" className="mt-4 w-full flex items-center justify-center gap-2 rounded-full bg-brand hover:bg-brandHover text-white py-2.5 print:hidden"><Printer size={14} />Print</button>
    </div>
  </div>;
}
