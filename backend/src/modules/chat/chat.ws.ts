import { z } from "zod";
import { wsGateway, WsClient } from "../../ws/gateway";
import { ChatService } from "./chat.service";

const payloadSchema = z.object({
  type: z.literal("chat:send"),
  sessionId: z.string().min(1),
  message: z.string().min(1)
});

// Handles registerChatWs logic.
export const registerChatWs = (chatService: ChatService): void => {
  wsGateway.addHandler(async (client: WsClient, payload: unknown) => {
    const parsed = payloadSchema.safeParse(payload);
    if (!parsed.success || !client.userId) return;

    const { sessionId, message } = parsed.data;
    await chatService.streamMessage(client.userId, sessionId, message, async (chunk) => {
      wsGateway.sendToUser(client.userId as string, {
        type: "chat:chunk",
        sessionId,
        chunk
      });
    });
    wsGateway.sendToUser(client.userId, { type: "chat:done", sessionId });
  });
};
