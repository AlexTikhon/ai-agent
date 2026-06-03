import { Server as HttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { verifyAccessToken } from "../lib/jwt";

export type WsClient = WebSocket & { userId?: string };
type MessageHandler = (client: WsClient, payload: unknown) => void | Promise<void>;

class Gateway {
  private wss: WebSocketServer | null = null;
  private handlers: MessageHandler[] = [];

  // Handles init logic.
  init(server: HttpServer): void {
    this.wss = new WebSocketServer({ server, path: "/ws" });

    this.wss.on("connection", (socket: WsClient, request) => {
      const url = new URL(request.url || "", "http://localhost");
      const token = url.searchParams.get("token");
      if (!token) {
        socket.close();
        return;
      }

      try {
        const payload = verifyAccessToken(token);
        socket.userId = payload.userId;
      } catch {
        socket.close();
        return;
      }

      socket.send(JSON.stringify({ type: "connected", message: "WS connected" }));
      socket.on("message", async (raw) => {
        try {
          const parsed = JSON.parse(raw.toString()) as unknown;
          for (const handler of this.handlers) {
            await handler(socket, parsed);
          }
        } catch {
          socket.send(JSON.stringify({ type: "error", message: "Invalid WS payload" }));
        }
      });
    });
  }

  // Handles addHandler logic.
  addHandler(handler: MessageHandler): void {
    this.handlers.push(handler);
  }

  // Handles sendToUser logic.
  sendToUser(userId: string, payload: unknown): void {
    if (!this.wss) return;
    const raw = JSON.stringify(payload);
    for (const client of this.wss.clients) {
      const typed = client as WsClient;
      if (typed.readyState === WebSocket.OPEN && typed.userId === userId) {
        typed.send(raw);
      }
    }
  }
}

export const wsGateway = new Gateway();
