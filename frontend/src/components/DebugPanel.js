import React, { useEffect, useState } from "react";
import { debugStore } from "../lib/debugStore";
import { Bug, X, Trash2, ChevronUp, ChevronDown } from "lucide-react";

const typeColor = {
  error: "text-red-400",
  ws: "text-emerald-300",
  info: "text-slate-300",
};

export default function DebugPanel() {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState("all"); // all | error | ws | info

  useEffect(() => debugStore.subscribe(setLogs), []);

  const errorCount = logs.filter((l) => l.type === "error").length;
  const visible = filter === "all" ? logs : logs.filter((l) => l.type === filter);

  return (
    <>
      {!open && (
        <button
          data-testid="debug-panel-toggle"
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 z-[9999] flex items-center gap-2 rounded-full glass-dark text-white px-4 py-2 shadow-lift hover:-translate-y-0.5 transition-all"
        >
          <Bug size={16} />
          <span className="text-xs font-mono">Debug</span>
          {errorCount > 0 && (
            <span className="ml-1 rounded-full bg-red-500 text-white text-[10px] px-1.5 py-0.5 font-mono">
              {errorCount}
            </span>
          )}
        </button>
      )}

      {open && (
        <div
          data-testid="debug-panel"
          className="fixed bottom-4 right-4 z-[9999] w-[92vw] sm:w-[520px] glass-dark text-white rounded-2xl shadow-lift overflow-hidden animate-fadeUp"
        >
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Bug size={14} className="text-emerald-300" />
              <span className="text-xs font-mono uppercase tracking-widest">
                Debug Console
              </span>
              <span className="text-[10px] text-white/50 font-mono">
                {logs.length} events · {errorCount} errors
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => debugStore.clear()}
                className="p-1.5 rounded-md hover:bg-white/10"
                title="Clear"
                data-testid="debug-clear-btn"
              >
                <Trash2 size={13} />
              </button>
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="p-1.5 rounded-md hover:bg-white/10"
                title={collapsed ? "Expand" : "Collapse"}
              >
                {collapsed ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-md hover:bg-white/10"
                data-testid="debug-close-btn"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {!collapsed && (
            <>
              <div className="px-3 py-2 flex gap-1 border-b border-white/10 text-[10px] font-mono">
                {["all", "error", "ws", "info"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-2 py-0.5 rounded-md uppercase tracking-wider ${
                      filter === f
                        ? "bg-white/15 text-white"
                        : "text-white/50 hover:text-white/80"
                    }`}
                    data-testid={`debug-filter-${f}`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <div className="max-h-[42vh] overflow-y-auto p-3 space-y-1 font-mono text-[11px] leading-relaxed">
                {visible.length === 0 && (
                  <div className="text-white/40 text-center py-6">
                    No {filter === "all" ? "" : filter} events yet
                  </div>
                )}
                {visible.map((l, i) => (
                  <div
                    key={i}
                    className="flex gap-2 border-b border-white/5 pb-1 last:border-none"
                  >
                    <span className="text-white/30 shrink-0">
                      {new Date(l.ts).toLocaleTimeString([], { hour12: false })}
                    </span>
                    <span
                      className={`shrink-0 w-10 uppercase ${typeColor[l.type] || "text-white/60"}`}
                    >
                      {l.type}
                    </span>
                    <span className="text-white/50 shrink-0">[{l.source}]</span>
                    <span className="text-white/90 break-words">{l.message}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
