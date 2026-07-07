import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { QrCode, ArrowRight, UtensilsCrossed, FlaskConical } from "lucide-react";

const PRESET_TABLES = [
  { table: "T1", token: "a91c92e8-0f41-4812-aab4-99a7c495f9fd" },
  { table: "T2", token: "29c43117-9e33-488a-b1b7-d4697fad080d" },
  { table: "T3", token: "3ec47e18-ffd3-4332-a26c-020bfac4ea8f" },
  { table: "T4", token: "74361b7f-e2b7-4be8-9e8c-4c771fe7a78a" },
  { table: "T5", token: "5ff5263d-0e28-449d-b4e6-4ece752c33a5" },
];

export default function TablePicker() {
  const nav = useNavigate();
  const [manual, setManual] = useState("");

  const goTo = (token) => {
    if (!token) return;
    nav(`/?qr=${encodeURIComponent(token.trim())}`);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url(https://images.unsplash.com/photo-1728501650832-57bafbf10a37?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MjJ8MHwxfHNlYXJjaHw0fHx3YXJtJTIwY296eSUyMHJlc3RhdXJhbnQlMjBpbnRlcmlvcnxlbnwwfHx8fDE3ODM0MTI0MTJ8MA&ixlib=rb-4.1.0&q=85)",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#2C362F]/50 via-[#2C362F]/70 to-[#2C362F]/90" />

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8 animate-fadeUp">
            <div className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full glass text-ink text-xs tracking-[0.3em] uppercase font-medium">
              <UtensilsCrossed size={14} className="text-brand" />
              Trattoria
            </div>
            <div className="inline-flex items-center gap-1.5 mb-3 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-100 text-[10px] tracking-widest uppercase font-semibold">
              <FlaskConical size={12} />
              Testing mode
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl font-semibold text-white tracking-tight">
              Pick a table
            </h1>
            <p className="text-white/70 mt-3 leading-relaxed text-sm">
              In production, customers reach this app by scanning the QR on their table. For
              testing, pick one of the seeded tables below or paste any QR token.
            </p>
          </div>

          <div className="glass rounded-3xl p-6 shadow-lift animate-fadeUp">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {PRESET_TABLES.map((t) => (
                <button
                  key={t.table}
                  onClick={() => goTo(t.token)}
                  data-testid={`table-${t.table}-btn`}
                  className="group relative rounded-2xl border border-bg2 bg-surface hover:border-brand hover:bg-brand/5 py-4 transition-all hover:-translate-y-0.5"
                >
                  <div className="text-[10px] uppercase tracking-widest text-ink2 font-semibold">
                    Table
                  </div>
                  <div className="font-heading text-2xl font-bold text-brand mt-1 tracking-tight">
                    {t.table}
                  </div>
                  <ArrowRight
                    size={12}
                    className="absolute top-2 right-2 text-ink2 opacity-0 group-hover:opacity-100 transition"
                  />
                </button>
              ))}
            </div>

            <div className="my-6 flex items-center gap-3">
              <div className="flex-1 h-px bg-bg2" />
              <span className="text-xs text-ink2 uppercase tracking-widest">or</span>
              <div className="flex-1 h-px bg-bg2" />
            </div>

            <label className="block text-xs uppercase tracking-[0.2em] font-semibold text-ink2 mb-2">
              QR Token
            </label>
            <div className="flex items-center gap-2 bg-bg border border-bg2 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-brand transition">
              <QrCode size={16} className="text-brand shrink-0" />
              <input
                data-testid="qr-token-input"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                placeholder="paste-any-qr-token"
                className="flex-1 bg-transparent outline-none font-mono text-sm truncate"
                onKeyDown={(e) => e.key === "Enter" && goTo(manual)}
              />
              <button
                onClick={() => goTo(manual)}
                disabled={!manual.trim()}
                data-testid="qr-token-go-btn"
                className="rounded-full bg-brand hover:bg-brandHover disabled:opacity-40 text-white px-4 py-1.5 text-sm font-medium transition"
              >
                Go
              </button>
            </div>

            <p className="mt-4 text-center text-xs text-ink2">
              Staff?{" "}
              <a
                href="/staff/login"
                data-testid="picker-staff-link"
                className="text-brand font-medium hover:underline"
              >
                Sign in here
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
