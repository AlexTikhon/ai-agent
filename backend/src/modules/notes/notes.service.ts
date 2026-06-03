import { llm } from "../../ai/llm";
import { cosineSimilarity, parseVector } from "../../lib/embedding";
import { NotesRepository } from "./notes.repository";

export class NotesService {
  // Handles constructor logic.
  constructor(private readonly repo: NotesRepository) {}

  // Handles create logic.
  async create(userId: string, title: string, content: string) {
    const tags = await llm.autoTags(`${title}\n${content}`);
    const note = await this.repo.create(userId, title, content, tags);
    const vector = await llm.embed(`${title}\n${content}`);
    await this.repo.upsertEmbedding(userId, note.id, vector);
    return note;
  }

  // Handles list logic.
  list(userId: string) {
    return this.repo.list(userId);
  }

  // Handles update logic.
  async update(userId: string, noteId: string, title: string, content: string) {
    const note = await this.repo.findById(userId, noteId);
    if (!note) throw new Error("Note not found");

    await this.repo.update(userId, noteId, title, content);
    const tags = await llm.autoTags(`${title}\n${content}`);
    await this.repo.updateTags(userId, noteId, tags);
    const vector = await llm.embed(`${title}\n${content}`);
    await this.repo.upsertEmbedding(userId, noteId, vector);
    return this.repo.getById(noteId);
  }

  // Handles remove logic.
  async remove(userId: string, noteId: string) {
    const note = await this.repo.findById(userId, noteId);
    if (!note) throw new Error("Note not found");
    return this.repo.remove(userId, noteId);
  }

  // Handles summarize logic.
  async summarize(userId: string, noteId: string) {
    const note = await this.repo.findById(userId, noteId);
    if (!note) throw new Error("Note not found");

    const summary = await llm.summarize(note.content);
    await this.repo.updateSummary(userId, noteId, summary);
    return { id: note.id, summary };
  }

  // Handles semanticSearch logic.
  async semanticSearch(userId: string, query: string) {
    const queryVector = await llm.embed(query);
    const rows = await this.repo.listNoteEmbeddings(userId);

    const ranked = rows
      .map((row) => {
        const vector = parseVector(row.vector);
        return {
          note: row.note,
          score: cosineSimilarity(queryVector, vector)
        };
      })
      .filter((row) => row.note)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return ranked;
  }
}
