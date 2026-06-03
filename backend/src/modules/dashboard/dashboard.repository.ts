import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";

export class DashboardRepository {
  // Handles getWidgetData logic.
  async getWidgetData(userId: string) {
    const [notesCount, tasksCount, filesCount, recentFiles, recentNotes] = await Promise.all([
      prisma.note.count({ where: { userId } }),
      prisma.task.count({ where: { userId, enabled: true } }),
      prisma.file.count({ where: { userId } }),
      prisma.file.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5
      }),
      prisma.note.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5
      })
    ]);

    return { notesCount, tasksCount, filesCount, recentFiles, recentNotes };
  }

  // Handles getLayout logic.
  getLayout(userId: string) {
    return prisma.dashboardLayout.findUnique({ where: { userId } });
  }

  // Handles saveLayout logic.
  async saveLayout(userId: string, layout: unknown) {
    const data = layout as Prisma.InputJsonValue;
    const existing = await this.getLayout(userId);
    if (existing) {
      return prisma.dashboardLayout.update({
        where: { id: existing.id },
        data: { layout: data }
      });
    }
    return prisma.dashboardLayout.create({
      data: { userId, layout: data }
    });
  }
}
