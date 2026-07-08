import { useCallback, useEffect, useRef, useState } from "react";
import { createStompClient } from "../lib/ws";
import { toast } from "sonner";

/**
 * Role-agnostic table overview data layer.
 *
 * Given a REST fetcher that returns TableSummaryResponse[], this hook:
 *   1) Fetches the initial list.
 *   2) Subscribes to `/topic/tables` — each message is a single TableSummaryResponse,
 *      which we merge into state by tableId.
 *   3) On every (re)connect, tab visibility change, and network `online` event,
 *      it re-runs the REST fetch to reconcile any missed updates.
 */
export default function useTableOverview(fetcher) {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refresh = useCallback(async () => {
    try {
      const list = await fetcherRef.current();
      if (Array.isArray(list)) {
        setTables(list);
        setError(null);
      }
    } catch (e) {
      setError(e?.message || "Failed to load tables");
      toast.error(e?.message || "Failed to load tables");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const { deactivate } = createStompClient({
      subscriptions: [
        {
          topic: "/topic/tables",
          handler: (payload) => {
            if (!payload || payload.tableId == null) return;
            setTables((prev) => {
              const idx = prev.findIndex((t) => t.tableId === payload.tableId);
              if (idx === -1) return [...prev, payload];
              const copy = [...prev];
              copy[idx] = payload;
              return copy;
            });
          },
        },
      ],
      onConnect: refresh,
    });

    const onVis = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", refresh);
    return () => {
      deactivate();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", refresh);
    };
  }, [refresh]);

  return { tables, loading, error, refresh };
}
