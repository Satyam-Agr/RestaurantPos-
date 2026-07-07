import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { logError, logWs } from "./debugStore";

const WS_URL = process.env.REACT_APP_WS_BASE_URL || "http://localhost:8080/ws";

/**
 * Create and connect a STOMP client.
 * subscriptions: [{ topic: string, handler: (payload) => void }]
 * onConnect: called after each successful (re)connect — REST reconciliation hook.
 */
export function createStompClient({ subscriptions = [], onConnect } = {}) {
  const client = new Client({
    webSocketFactory: () => new SockJS(WS_URL),
    reconnectDelay: 3000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    debug: () => {},
  });

  const subs = [];

  client.onConnect = () => {
    logWs("ws", "Connected", { url: WS_URL });
    // clear previous subs (in case of reconnect)
    while (subs.length) {
      try {
        subs.pop().unsubscribe();
      } catch (e) {
        /* noop */
      }
    }
    subscriptions.forEach(({ topic, handler }) => {
      const sub = client.subscribe(topic, (msg) => {
        try {
          const body = msg.body ? JSON.parse(msg.body) : null;
          logWs("ws", `Message ${topic}`);
          handler(body);
        } catch (e) {
          logError("ws", `Bad message on ${topic}`, msg.body);
        }
      });
      subs.push(sub);
      logWs("ws", `Subscribed ${topic}`);
    });
    if (onConnect) onConnect();
  };

  client.onStompError = (frame) => {
    logError("ws", `STOMP error: ${frame.headers?.message || "unknown"}`, frame.body);
  };
  client.onWebSocketError = (err) => {
    logError("ws", "WebSocket error", String(err?.message || err));
  };
  client.onDisconnect = () => logWs("ws", "Disconnected");

  client.activate();

  return {
    client,
    deactivate: () => {
      try {
        client.deactivate();
      } catch (e) {
        /* noop */
      }
    },
  };
}
