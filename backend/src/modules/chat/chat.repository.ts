import { prisma } from "../../db/prisma";

export class ChatRepository {
  // Handles saveMessage logic.
  saveMessage(userId: string, sessionId: string, role: string, content: string) {
    return prisma.chatMessage.create({
      data: { userId, sessionId, role, content }
    });
  }

  // Handles listSessionMessages logic.
  listSessionMessages(userId: string, sessionId: string, limit = 20) {
    return prisma.chatMessage.findMany({
      where: { userId, sessionId },
      orderBy: { createdAt: "asc" },
      take: limit
    });
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
}
