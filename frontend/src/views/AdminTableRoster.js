import React, { useEffect, useState } from "react";
import AdminShell from "../components/AdminShell";
import {
  adminTablesRoster,
  adminCreateTable,
  adminUpdateTable,
  adminRetireTables,
  adminReactivateTables,
} from "../lib/api";
import { toast } from "sonner";
import { Plus, Edit2, Loader2, X, QrCode, Printer, ShieldCheck, Power } from "lucide-react";
import FilterTabs from "../components/FilterTabs";
import BulkCreateModal, { BulkField } from "../components/BulkCreateModal";
import StatusManagerModal from "../components/StatusManagerModal";
import PinModal from "../components/PinModal";

export default function AdminTableRoster() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState(null);
  const [creating, setCreating] = useState(false);
  const [managing, setManaging] = useState(false);
  const [qr, setQr] = useState(null);
  const [filter, setFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    try { setRows(await adminTablesRoster()); } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

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
        <div className="flex gap-2">
          <button
            onClick={() => setManaging(true)}
            data-testid="manage-table-status-btn"
            className="flex items-center gap-1.5 rounded-full border border-bg2 hover:border-brand hover:text-brand text-sm px-4 py-2 transition"
          >
            <Power size={12} />
            Manage status
          </button>
          <button
            onClick={() => setCreating(true)}
            data-testid="new-table-btn"
            className="flex items-center gap-1.5 rounded-full bg-brand hover:bg-brandHover text-white text-sm px-4 py-2 shadow-soft"
          >
            <Plus size={12} />
            New Table
          </button>
        </div>
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
              </div>
            </div>
          ))}
          {!rows.length && <div className="col-span-full text-center py-10 text-ink2 border border-dashed border-bg2 rounded-2xl">No tables yet.</div>}
        </div>
      )}

      {edit && <EditModal row={edit} onClose={() => setEdit(null)} onDone={() => { setEdit(null); load(); }} />}
      {qr && <QRModal row={qr} onClose={() => setQr(null)} />}
      {creating && (
        <BulkCreateModal
          title="Add Tables"
          emptyDraft={() => ({ tableNumber: "" })}
          validate={(d) => {
            if (!String(d.tableNumber ?? "").trim()) return "Table number is required";
            return null;
          }}
          renderRow={(d, patch) => (
            <BulkField
              label="Table number"
              value={d.tableNumber}
              onChange={(v) => patch({ tableNumber: v })}
              required
            />
          )}
          onSubmit={(pin, entries) =>
            adminCreateTable(
              pin,
              entries.map((e) => ({ tableNumber: String(e.tableNumber).trim() }))
            )
          }
          onClose={() => setCreating(false)}
          onDone={() => { setCreating(false); load(); }}
        />
      )}

      {managing && (
        <StatusManagerModal
          title="Manage Table Status"
          activeLabel="Live"
          inactiveLabel="Retired"
          activeRows={rows.filter((r) => !r.retired)}
          inactiveRows={rows.filter((r) => r.retired)}
          getId={(r) => r.id}
          searchOf={(r) => String(r.tableNumber)}
          renderRow={(r) => (
            <div className="flex items-center gap-3">
              <div className="text-[10px] uppercase tracking-widest text-ink2 font-semibold">Table</div>
              <div className="font-heading text-lg font-bold">{r.tableNumber}</div>
            </div>
          )}
          activateAction={{
            verb: "Reactivate",
            danger: false,
            run: (pin, ids) => adminReactivateTables(pin, ids),
          }}
          deactivateAction={{
            verb: "Retire",
            danger: true,
            run: (pin, ids) => adminRetireTables(pin, ids),
          }}
          onClose={() => setManaging(false)}
          onDone={() => { setManaging(false); load(); }}
        />
      )}
    </AdminShell>
  );
}

function EditModal({ row, onClose, onDone }) {
  const [n, setN] = useState(row.tableNumber || "");
  const [askPin, setAskPin] = useState(false);
  const trimmed = String(n).trim();
  const canSave = trimmed.length > 0 && trimmed !== String(row.tableNumber);

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/50 grid place-items-center p-4" onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()} className="bg-surface rounded-3xl max-w-sm w-full p-6 shadow-lift">
          <div className="flex justify-between mb-4">
            <h3 className="font-heading text-lg font-semibold">Rename Table</h3>
            <button type="button" onClick={onClose} className="text-ink2 hover:text-ink p-1"><X size={16} /></button>
          </div>
          <label className="block">
            <span className="text-[10px] uppercase tracking-widest text-ink2 font-semibold">Table Number *</span>
            <input
              value={n}
              onChange={(e) => setN(e.target.value)}
              autoFocus
              data-testid="table-edit-number"
              className="mt-1 w-full bg-bg border border-bg2 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand"
            />
          </label>
          <button
            type="button"
            onClick={() => setAskPin(true)}
            disabled={!canSave}
            data-testid="table-save"
            className="mt-5 w-full flex items-center justify-center gap-2 rounded-full bg-brand hover:bg-brandHover text-white py-2.5 disabled:opacity-50"
          >
            <ShieldCheck size={14} />
            Save
          </button>
        </div>
      </div>

      {askPin && (
        <PinModal
          title="Confirm rename"
          description={`Rename Table ${row.tableNumber} → ${trimmed}. Enter your admin PIN.`}
          onClose={() => setAskPin(false)}
          onSubmit={async (pin) => {
            try {
              await adminUpdateTable(row.id, { pin, tableNumber: trimmed });
            } catch (e2) {
              if (e2.status === 409) {
                // eslint-disable-next-line no-throw-literal
                throw { ...e2, message: "Table number already in use." };
              }
              throw e2;
            }
            toast.success("Renamed");
            setAskPin(false);
            onDone();
          }}
        />
      )}
    </>
  );
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
