import { llm } from "../../ai/llm";
import { ChatRepository } from "./chat.repository";

type ChunkHandler = (chunk: string) => Promise<void> | void;

export class ChatService {
  // Handles constructor logic.
  constructor(private readonly repo: ChatRepository) {}

  // Handles listSessions logic.
  listSessions(userId: string) {
    return this.repo.listSessions(userId);
  }

  // Handles listSessionMessages logic.
  listSessionMessages(userId: string, sessionId: string) {
    return this.repo.listSessionMessages(userId, sessionId);
  }

  // Handles sendMessage logic.
  async sendMessage(userId: string, sessionId: string, message: string) {
    await this.repo.saveMessage(userId, sessionId, "user", message);
    const history = await this.repo.listSessionMessages(userId, sessionId, 25);
    const completion = await llm.chat(
      history.map((m) => ({
        role: (m.role as "system" | "user" | "assistant") || "user",
        content: m.content
      }))
    );
    await this.repo.saveMessage(userId, sessionId, "assistant", completion);
    return completion;
  }

  // Handles streamMessage logic.
  async streamMessage(userId: string, sessionId: string, message: string, onChunk: ChunkHandler) {
    const full = await this.sendMessage(userId, sessionId, message);
    const parts = full.split(" ");
    for (const part of parts) {
      await onChunk(`${part} `);
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
    return full;
  }
}
