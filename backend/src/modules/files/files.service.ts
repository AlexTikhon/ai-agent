import fs from "fs/promises";
import path from "path";
import pdfParse from "pdf-parse";
import { env } from "../../config/env";
import { llm } from "../../ai/llm";
import { cosineSimilarity, parseVector } from "../../lib/embedding";
import { FilesRepository } from "./files.repository";

export class FilesService {
  // Handles constructor logic.
  constructor(private readonly repo: FilesRepository) {}

  async uploadPdf(
    userId: string,
    fileName: string,
    mimeType: string,
    fileBuffer: Buffer
  ) {
    const parsed = await pdfParse(fileBuffer);
    const extractedText = parsed.text || "";
    const summary = await llm.summarize(extractedText);

    await fs.mkdir(env.UPLOAD_DIR, { recursive: true });
    const safeName = `${Date.now()}-${fileName.replace(/[^\w.\-]/g, "_")}`;
    const storagePath = path.join(env.UPLOAD_DIR, safeName);
    await fs.writeFile(storagePath, fileBuffer);

    const file = await this.repo.create(
      userId,
      fileName,
      mimeType,
      storagePath,
      extractedText,
      summary
    );
    const vector = await llm.embed(extractedText.slice(0, 4000));
    await this.repo.upsertEmbedding(userId, file.id, vector);
    return file;
  }

  // Handles list logic.
  list(userId: string) {
    return this.repo.list(userId);
  }

  // Handles searchSimilar logic.
  async searchSimilar(userId: string, query: string) {
    const queryVector = await llm.embed(query);
    const rows = await this.repo.listFileEmbeddings(userId);

    return rows
      .map((row) => ({
        file: row.file,
        score: cosineSimilarity(queryVector, parseVector(row.vector))
      }))
      .filter((row) => row.file)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }
}
