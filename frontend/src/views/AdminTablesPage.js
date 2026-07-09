import React, { useEffect, useState } from "react";
import AdminShell from "../components/AdminShell";
import PinModal from "../components/PinModal";
import {
  adminTablesList,
  adminTableDetail,
  adminFreeSession,
  adminRevealParticipants,
  adminOrderHistory,
} from "../lib/api";
import { toast } from "sonner";
import {
  Users, Eye, Ban, Loader2, X, Clock, History, Phone, RefreshCw, Search,
} from "lucide-react";

export default function AdminTablesPage() {
  const [tables, setTables] = useState([]);
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pinFor, setPinFor] = useState(null); // { action, tableId, tableNumber }
  const [participants, setParticipants] = useState(null);
  const [orderAudit, setOrderAudit] = useState(null); // { orderId, events }

  const load = async () => {
    setRefreshing(true);
    try {
      const list = await adminTablesList();
      setTables(Array.isArray(list) ? list : []);
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  };
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, []);

  const openDetail = async (row) => {
    try {
      const d = await adminTableDetail(row.tableId);
      setDetail(d);
      setParticipants(null);
    } catch (e) { toast.error(e.message); }
  };

  const filtered = tables.filter((t) =>
    !q || String(t.tableNumber).toLowerCase().includes(q.toLowerCase())
  );

  return (
    <AdminShell title="Live Tables">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-2 bg-surface border border-bg2 rounded-full px-3 py-1.5 flex-1 max-w-xs">
          <Search size={14} className="text-ink2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search table…" className="flex-1 bg-transparent outline-none text-sm" data-testid="tables-search" />
        </div>
        <button onClick={load} disabled={refreshing} data-testid="tables-refresh" className="text-sm text-ink2 hover:text-brand flex items-center gap-1.5">
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />Refresh
        </button>
      </div>

      {loading ? <Loader2 className="animate-spin text-brand mx-auto mt-10" size={24} /> : (
        <div className="bg-surface border border-bg2 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg text-[10px] uppercase tracking-widest text-ink2 font-semibold">
              <tr><th className="text-left px-4 py-2">Table</th><th className="text-left px-4 py-2">Status</th><th className="text-left px-4 py-2">Guests</th><th className="text-left px-4 py-2">Orders</th><th className="text-right px-4 py-2">Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.tableId} className="border-t border-bg2 hover:bg-bg/60" data-testid={`row-${t.tableId}`}>
                  <td className="px-4 py-2 font-heading font-semibold">{t.tableNumber}</td>
                  <td className="px-4 py-2 text-xs">{t.overviewStatus}</td>
                  <td className="px-4 py-2 text-xs">{t.participantCount ?? "—"}</td>
                  <td className="px-4 py-2 text-xs">{t.orderCount ?? t.ordersAwaitingConfirmation ?? "—"}</td>
                  <td className="px-4 py-2 text-right"><button onClick={() => openDetail(t)} className="text-xs text-brand hover:underline" data-testid={`view-${t.tableId}`}>View</button></td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan={5} className="text-center py-8 text-ink2">No tables.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {detail && (
        <Panel onClose={() => setDetail(null)}>
          <div className="mb-3">
            <div className="text-[10px] uppercase tracking-widest text-ink2 font-semibold">Table</div>
            <div className="font-heading text-3xl font-bold">{detail.tableNumber}</div>
            <div className="text-xs text-ink2 mt-1">Status: <span className="font-semibold">{detail.overviewStatus}</span></div>
          </div>

          {detail.sessionId && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button onClick={() => setPinFor({ action: "reveal", tableId: detail.tableId, tableNumber: detail.tableNumber })} data-testid="reveal-btn" className="flex items-center justify-center gap-1.5 rounded-full border border-bg2 hover:border-brand text-sm py-2">
                <Eye size={12} />Reveal Phones
              </button>
              <button onClick={() => setPinFor({ action: "free", tableId: detail.tableId, tableNumber: detail.tableNumber })} data-testid="free-btn" className="flex items-center justify-center gap-1.5 rounded-full border border-destructive/40 text-destructive hover:bg-destructive/5 text-sm py-2">
                <Ban size={12} />Free Session
              </button>
            </div>
          )}

          {participants && (
            <div className="mb-4 bg-bg border border-bg2 rounded-xl p-3">
              <div className="text-[10px] uppercase tracking-widest text-ink2 font-semibold flex items-center gap-1.5 mb-2"><Phone size={11} />Participants</div>
              {participants.map((p, i) => <div key={i} className="text-sm font-mono py-0.5">+91 {p.phoneNumber || p.phone || "—"}</div>)}
            </div>
          )}

          {detail.orders?.map((o) => (
            <div key={o.id} className="bg-bg rounded-xl p-3 mb-2 border border-bg2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink2 font-mono">Order #{o.id} · {o.status}</span>
                <button onClick={async () => { try { const h = await adminOrderHistory(o.id); setOrderAudit({ orderId: o.id, events: h }); } catch (e) { toast.error(e.message); } }} className="text-brand hover:underline flex items-center gap-1"><History size={11} />Audit</button>
              </div>
              <div className="mt-2 space-y-0.5">
                {o.items?.map((it) => <div key={it.id} className="text-sm">{it.quantity}× {it.menuItemName} <span className="text-xs text-ink2">· {it.itemStatus}</span></div>)}
              </div>
            </div>
          ))}
        </Panel>
      )}

      {pinFor && (
        <PinModal
          title={pinFor.action === "free" ? `Free Table ${pinFor.tableNumber}?` : `Reveal phones for Table ${pinFor.tableNumber}`}
          description={pinFor.action === "free" ? "This ends the customer session immediately. Enter your admin PIN to confirm." : "Enter your admin PIN to view participant phone numbers."}
          danger={pinFor.action === "free"}
          onClose={() => setPinFor(null)}
          onSubmit={async (pin) => {
            if (pinFor.action === "free") {
              await adminFreeSession(pinFor.tableId, pin);
              toast.success("Session freed");
              setPinFor(null); setDetail(null); load();
            } else {
              const p = await adminRevealParticipants(pinFor.tableId, pin);
              setParticipants(Array.isArray(p) ? p : p?.participants || []);
              setPinFor(null);
            }
          }}
        />
      )}

      {orderAudit && (
        <div className="fixed inset-0 z-[70] bg-black/60 grid place-items-center p-4" onClick={() => setOrderAudit(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-surface rounded-3xl max-w-lg w-full p-5 shadow-lift max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading text-lg font-semibold flex items-center gap-2"><History size={14} />Order #{orderAudit.orderId} History</h3>
              <button onClick={() => setOrderAudit(null)}><X size={16} /></button>
            </div>
            <div className="space-y-2 text-sm">
              {(orderAudit.events || []).map((e, i) => (
                <div key={i} className="border-l-2 border-brand pl-3 py-1">
                  <div className="text-xs text-ink2 flex items-center gap-1"><Clock size={10} />{e.at ? new Date(e.at).toLocaleString() : "—"}</div>
                  <div className="font-medium">{e.action || e.type || "Event"}</div>
                  {e.actorName && <div className="text-xs text-ink2">by {e.actorName} ({e.actorRole})</div>}
                  {e.details && <pre className="text-xs text-ink2 mt-1 whitespace-pre-wrap font-mono">{typeof e.details === "string" ? e.details : JSON.stringify(e.details, null, 2)}</pre>}
                </div>
              ))}
              {!orderAudit.events?.length && <p className="text-ink2 text-center py-4">No events recorded.</p>}
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

function Panel({ onClose, children }) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end" data-testid="admin-detail-panel">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full sm:w-[420px] bg-surface h-full shadow-lift overflow-y-auto">
        <div className="sticky top-0 flex justify-end p-3 bg-surface border-b border-bg2"><button onClick={onClose} data-testid="detail-close"><X size={16} /></button></div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
