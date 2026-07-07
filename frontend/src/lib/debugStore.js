// Simple global event bus + error/debug log store (no external state lib needed)

const listeners = new Set();
let logs = []; // { ts, type, source, message, detail }

const emit = () => listeners.forEach((fn) => fn(logs));

export const debugStore = {
  subscribe(fn) {
    listeners.add(fn);
    fn(logs);
    return () => listeners.delete(fn);
  },
  push(entry) {
    const item = {
      ts: new Date().toISOString(),
      type: entry.type || "info",
      source: entry.source || "app",
      message: entry.message || "",
      detail: entry.detail || null,
    };
    logs = [item, ...logs].slice(0, 200);
    emit();
  },
  clear() {
    logs = [];
    emit();
  },
  get() {
    return logs;
  },
};

export const logInfo = (source, message, detail) =>
  debugStore.push({ type: "info", source, message, detail });
export const logWs = (source, message, detail) =>
  debugStore.push({ type: "ws", source, message, detail });
export const logError = (source, message, detail) =>
  debugStore.push({ type: "error", source, message, detail });
