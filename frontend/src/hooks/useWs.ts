import { useEffect, useRef } from "react";
import { useAuthStore } from "../store/auth.store";

type WsHandler = (payload: unknown) => void;

// Handles useWs logic.
export const useWs = (onMessage: WsHandler) => {
  const socketRef = useRef<WebSocket | null>(null);
  const token = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!token) return;
    const baseUrl = import.meta.env.VITE_WS_URL || "ws://localhost:4000/ws";
    const ws = new WebSocket(`${baseUrl}?token=${token}`);
    socketRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        onMessage(payload);
      } catch {
        // ignore invalid payload
      }
    };

    return () => {
      ws.close();
      socketRef.current = null;
    };
  }, [token, onMessage]);

  return socketRef;
};
