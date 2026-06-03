import { prisma } from "../../db/prisma";

export class FilesRepository {
  create(
    userId: string,
    fileName: string,
    mimeType: string,
    storagePath: string,
    extractedText: string,
    summary: string
  ) {
    return prisma.file.create({
      data: { userId, fileName, mimeType, storagePath, extractedText, summary }
    });
  }

  // Handles list logic.
  list(userId: string) {
    return prisma.file.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });
  }

  // Handles findById logic.
  findById(userId: string, fileId: string) {
    return prisma.file.findFirst({
      where: { userId, id: fileId }
    });
  }

  // Handles upsertEmbedding logic.
  async upsertEmbedding(userId: string, fileId: string, vector: number[]) {
    const existing = await prisma.embedding.findFirst({
      where: { userId, fileId, sourceType: "file" }
    });

    if (existing) {
      return prisma.embedding.update({
        where: { id: existing.id },
        data: { vector, sourceId: fileId }
      });
    }

    return prisma.embedding.create({
      data: {
        userId,
        fileId,
        sourceType: "file",
        sourceId: fileId,
        vector
      }
    });
  }

  // Handles listFileEmbeddings logic.
  listFileEmbeddings(userId: string) {
    return prisma.embedding.findMany({
      where: { userId, sourceType: "file", fileId: { not: null } },
      include: { file: true }
    });
  }
}
