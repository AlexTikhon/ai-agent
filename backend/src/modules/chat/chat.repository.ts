import { prisma } from "../../db/prisma";

export class ChatRepository {
  // Handles saveMessage logic.
  saveMessage(userId: string, sessionId: string, role: string, content: string) {
    return prisma.chatMessage.create({
      data: { userId, sessionId, role, content }
    });
  }

  // Handles listSessionMessages logic.
  async listSessionMessages(userId: string, sessionId: string, limit = 20) {
    const messages = await prisma.chatMessage.findMany({
      where: { userId, sessionId },
      orderBy: { createdAt: "desc" },
      take: limit
    });
    return messages.reverse();
  }

  // Handles listSessions logic.
  listSessions(userId: string) {
    return prisma.chatMessage.groupBy({
      by: ["sessionId"],
      where: { userId },
      _max: { createdAt: true },
      orderBy: { _max: { createdAt: "desc" } }
    });
  }

  // Handles listKnowledgeEmbeddings logic.
  listKnowledgeEmbeddings(userId: string) {
    return prisma.embedding.findMany({
      where: {
        userId,
        OR: [
          { sourceType: "note", noteId: { not: null } },
          { sourceType: "file", fileId: { not: null } }
        ]
      },
      include: {
        note: true,
        file: true
      }
    });
  }
}
