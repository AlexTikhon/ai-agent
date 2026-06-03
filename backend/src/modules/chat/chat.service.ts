import { llm } from "../../ai/llm";
import { cosineSimilarity, parseVector } from "../../lib/embedding";
import { ChatRepository } from "./chat.repository";

type ChunkHandler = (chunk: string) => Promise<void> | void;

type RagSource = {
  label: string;
  type: "note" | "file";
  id: string;
  title: string;
  score: number;
  excerpt: string;
};

const MAX_CONTEXT_SOURCES = 6;
const MIN_CONTEXT_SCORE = 0.05;
const EXCERPT_CHARS = 900;

// Handles excerpt logic.
const excerpt = (value: string | null | undefined) =>
  (value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, EXCERPT_CHARS);

// Handles formatContext logic.
const formatContext = (sources: RagSource[]) =>
  sources
    .map(
      (source) =>
        `[${source.label}] ${source.type.toUpperCase()}: ${source.title}\n` +
        `id: ${source.id}\n` +
        `relevance: ${source.score.toFixed(3)}\n` +
        `content: ${source.excerpt}`
    )
    .join("\n\n");

// Handles formatSources logic.
const formatSources = (sources: RagSource[]) => {
  if (sources.length === 0) return "";

  return [
    "",
    "Sources:",
    ...sources.map(
      (source) =>
        `[${source.label}] ${source.type}: ${source.title} (${source.score.toFixed(2)})`
    )
  ].join("\n");
};

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

  // Handles retrieveContext logic.
  private async retrieveContext(userId: string, message: string): Promise<RagSource[]> {
    const queryVector = await llm.embed(message);
    const rows = await this.repo.listKnowledgeEmbeddings(userId);

    return rows
      .map((row) => {
        const score = cosineSimilarity(queryVector, parseVector(row.vector));
        if (row.sourceType === "note" && row.note) {
          return {
            type: "note" as const,
            id: row.note.id,
            title: row.note.title,
            score,
            excerpt: excerpt(row.note.summary || row.note.content)
          };
        }

        if (row.sourceType === "file" && row.file) {
          return {
            type: "file" as const,
            id: row.file.id,
            title: row.file.fileName,
            score,
            excerpt: excerpt(row.file.summary || row.file.extractedText)
          };
        }

        return null;
      })
      .filter((source): source is Omit<RagSource, "label"> => Boolean(source?.excerpt))
      .filter((source) => source.score >= MIN_CONTEXT_SCORE)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_CONTEXT_SOURCES)
      .map((source, index) => ({ ...source, label: `S${index + 1}` }));
  }

  // Handles sendMessage logic.
  async sendMessage(userId: string, sessionId: string, message: string) {
    await this.repo.saveMessage(userId, sessionId, "user", message);

    const [history, sources] = await Promise.all([
      this.repo.listSessionMessages(userId, sessionId, 25),
      this.retrieveContext(userId, message)
    ]);

    const context = formatContext(sources);
    const developerPrompt =
      sources.length > 0
        ? [
            "Use the retrieved workspace context below when it is relevant.",
            "Cite sources inline with labels like [S1].",
            "If the context does not contain enough information, say what is missing and answer from general knowledge only when appropriate.",
            "Retrieved context:",
            context
          ].join("\n\n")
        : [
            "No relevant notes or files were found for this message.",
            "Answer normally, and do not invent workspace sources."
          ].join("\n");

    const completion = await llm.chat([
      { role: "developer", content: developerPrompt },
      ...history.map((m) => ({
        role: (m.role as "system" | "user" | "assistant") || "user",
        content: m.content
      }))
    ]);

    const answer = `${completion}${formatSources(sources)}`;
    await this.repo.saveMessage(userId, sessionId, "assistant", answer);
    return answer;
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
