import React, { useEffect, useState } from "react";
import AdminShell from "../components/AdminShell";
import { adminRevenue, adminTopItems, adminTiming } from "../lib/api";
import { toast } from "sonner";
import { Loader2, TrendingUp, Trophy, Timer, Calendar } from "lucide-react";

export default function AdminAnalyticsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400e3).toISOString().slice(0, 10);
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [rev, setRev] = useState(null);
  const [top, setTop] = useState([]);
  const [timing, setTiming] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [r, t, ti] = await Promise.all([
        adminRevenue({ from, to }).catch(() => null),
        adminTopItems({ from, to }).catch(() => []),
        adminTiming({ from, to }).catch(() => null),
      ]);
      setRev(r); setTop(Array.isArray(t) ? t : t?.items || []); setTiming(ti);
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  // Revenue series can come in various shapes; try common ones.
  const series = rev?.daily || rev?.series || rev?.days || (Array.isArray(rev) ? rev : []);
  const max = Math.max(...series.map((d) => Number(d.total || d.revenue || 0)), 1);
  const totalRev = series.reduce((s, d) => s + Number(d.total || d.revenue || 0), 0);

  return (
    <AdminShell title="Analytics">
      <div className="flex flex-wrap items-end gap-3 mb-6">
        <label className="block"><span className="text-[10px] uppercase tracking-widest text-ink2 font-semibold flex items-center gap-1"><Calendar size={10} />From</span><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 bg-bg border border-bg2 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand" /></label>
        <label className="block"><span className="text-[10px] uppercase tracking-widest text-ink2 font-semibold">To</span><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 bg-bg border border-bg2 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand" /></label>
        <button onClick={load} data-testid="analytics-apply" className="rounded-full bg-brand hover:bg-brandHover text-white text-sm px-5 py-2 shadow-soft">Apply</button>
      </div>

      {loading ? <Loader2 className="animate-spin text-brand mx-auto mt-10" size={24} /> : (
        <div className="space-y-5">
          {/* Revenue chart */}
          <div className="bg-surface border border-bg2 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-1"><TrendingUp size={16} className="text-brand" /><h2 className="font-heading text-lg font-semibold">Revenue</h2><span className="ml-auto font-heading text-2xl font-bold text-brand">₹{totalRev.toFixed(2)}</span></div>
            <p className="text-xs text-ink2 mb-4">Daily revenue for the selected range.</p>
            {series.length === 0 ? <p className="text-ink2 text-sm py-6 text-center">No data.</p> : (
              <div className="flex items-end gap-1 h-40">
                {series.map((d, i) => {
                  const v = Number(d.total || d.revenue || 0);
                  const h = (v / max) * 100;
                  return (
                    <div key={i} className="flex-1 group relative flex flex-col items-center">
                      <div className="w-full bg-brand/80 hover:bg-brand rounded-t transition" style={{ height: `${h}%` }} title={`${d.date || d.day || i}: ₹${v.toFixed(2)}`} />
                      <div className="text-[8px] text-ink2 mt-1 rotate-45 origin-top-left h-4 whitespace-nowrap">{(d.date || d.day || "").slice(5)}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top items */}
          <div className="bg-surface border border-bg2 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4"><Trophy size={16} className="text-brand" /><h2 className="font-heading text-lg font-semibold">Top Items</h2></div>
            {top.length === 0 ? <p className="text-ink2 text-sm py-4 text-center">No data.</p> : (
              <div className="space-y-2">
                {top.slice(0, 10).map((it, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-6 text-center font-mono text-ink2 text-xs">#{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{it.menuItemName || it.name}</div>
                      <div className="h-1.5 bg-bg2 rounded-full mt-1 overflow-hidden"><div className="h-full bg-brand" style={{ width: `${((it.quantity || it.count || 0) / (top[0].quantity || top[0].count || 1)) * 100}%` }} /></div>
                    </div>
                    <div className="text-right shrink-0"><div className="text-sm font-mono font-semibold">{it.quantity || it.count}</div><div className="text-[10px] text-ink2">sold</div></div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Timing */}
          <div className="bg-surface border border-bg2 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4"><Timer size={16} className="text-brand" /><h2 className="font-heading text-lg font-semibold">Timing</h2></div>
            {!timing ? <p className="text-ink2 text-sm py-4 text-center">No data.</p> : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(timing).map(([k, v]) => (
                  <div key={k} className="bg-bg rounded-xl p-3 border border-bg2">
                    <div className="text-[10px] uppercase tracking-widest text-ink2 font-semibold">{k.replace(/([A-Z])/g, " $1").trim()}</div>
                    <div className="font-heading text-xl font-bold">{typeof v === "number" ? `${v.toFixed(1)}m` : String(v)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AdminShell>
  );
}
