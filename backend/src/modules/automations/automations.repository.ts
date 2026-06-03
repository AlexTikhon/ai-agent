import { prisma } from "../../db/prisma";

export class AutomationsRepository {
  // Handles create logic.
  create(userId: string, title: string, cronExpr: string, description?: string) {
    return prisma.task.create({
      data: { userId, title, cronExpr, description }
    });
  }

  // Handles list logic.
  list(userId: string) {
    return prisma.task.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });
  }

  // Handles listAllEnabled logic.
  listAllEnabled() {
    return prisma.task.findMany({
      where: { enabled: true }
    });
  }

  // Handles markLastRun logic.
  markLastRun(taskId: string) {
    return prisma.task.update({
      where: { id: taskId },
      data: { lastRunAt: new Date() }
    });
  }
}
