import { prisma } from "../../db/prisma";

export class NotesRepository {
  // Handles create logic.
  create(userId: string, title: string, content: string, tags: string[]) {
    return prisma.note.create({
      data: { userId, title, content, tags }
    });
  }

  // Handles list logic.
  list(userId: string) {
    return prisma.note.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });
  }

  // Handles findById logic.
  findById(userId: string, noteId: string) {
    return prisma.note.findFirst({
      where: { id: noteId, userId }
    });
  }

  // Handles update logic.
  update(userId: string, noteId: string, title: string, content: string) {
    return prisma.note.updateMany({
      where: { id: noteId, userId },
      data: { title, content }
    });
  }

  // Handles remove logic.
  remove(userId: string, noteId: string) {
    return prisma.note.deleteMany({
      where: { id: noteId, userId }
    });
  }

  // Handles getById logic.
  getById(noteId: string) {
    return prisma.note.findUnique({
      where: { id: noteId }
    });
  }

  // Handles updateSummary logic.
  updateSummary(userId: string, noteId: string, summary: string) {
    return prisma.note.updateMany({
      where: { id: noteId, userId },
      data: { summary }
    });
  }

  // Handles updateTags logic.
  updateTags(userId: string, noteId: string, tags: string[]) {
    return prisma.note.updateMany({
      where: { id: noteId, userId },
      data: { tags }
    });
  }

  // Handles upsertEmbedding logic.
  async upsertEmbedding(userId: string, noteId: string, vector: number[]) {
    const existing = await prisma.embedding.findFirst({
      where: { userId, noteId, sourceType: "note" }
    });

    if (existing) {
      return prisma.embedding.update({
        where: { id: existing.id },
        data: { vector, sourceId: noteId }
      });
    }

    return prisma.embedding.create({
      data: {
        userId,
        noteId,
        sourceType: "note",
        sourceId: noteId,
        vector
      }
    });
  }

  // Handles listNoteEmbeddings logic.
  listNoteEmbeddings(userId: string) {
    return prisma.embedding.findMany({
      where: { userId, sourceType: "note", noteId: { not: null } },
      include: { note: true }
    });
  }
}
