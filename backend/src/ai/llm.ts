import OpenAI from "openai";
import { env } from "../config/env";

type ChatMessageInput = {
  role: "system" | "user" | "assistant";
  content: string;
};

const client = new OpenAI({
  apiKey: env.OPENAI_API_KEY
});

const MAX_TEXT_INPUT_CHARS = 12000;
const MAX_EMBED_INPUT_CHARS = 12000;

const compact = (text: string, maxChars = MAX_TEXT_INPUT_CHARS) => text.trim().slice(0, maxChars);

const getOutputText = (output: { output_text?: string }) => {
  const text = output.output_text?.trim();
  if (!text) throw new Error("OpenAI returned an empty response");
  return text;
};

const parseTags = (raw: string) => {
  const parsed = JSON.parse(raw) as { tags?: unknown };
  if (!Array.isArray(parsed.tags)) return [];

  return parsed.tags
    .filter((tag): tag is string => typeof tag === "string")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 6);
};

export const llm = {
  async summarize(text: string): Promise<string> {
    const input = compact(text);
    if (!input) return "";

    const response = await client.responses.create({
      model: env.OPENAI_CHAT_MODEL,
      instructions:
        "Summarize the user's text in 3-5 concise sentences. Preserve important facts, names, dates, and action items.",
      input
    });

    return getOutputText(response);
  },

  async autoTags(text: string): Promise<string[]> {
    const input = compact(text);
    if (!input) return [];

    const response = await client.responses.create({
      model: env.OPENAI_CHAT_MODEL,
      instructions:
        "Extract up to 6 short, lowercase tags from the user's text. Use specific topic labels, not generic words.",
      input,
      text: {
        format: {
          type: "json_schema",
          name: "auto_tags",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              tags: {
                type: "array",
                items: { type: "string" },
                maxItems: 6
              }
            },
            required: ["tags"]
          }
        }
      }
    });

    return parseTags(getOutputText(response));
  },

  async embed(text: string): Promise<number[]> {
    const input = compact(text, MAX_EMBED_INPUT_CHARS) || "(empty)";
    const response = await client.embeddings.create({
      model: env.OPENAI_EMBEDDING_MODEL,
      input
    });

    return response.data[0]?.embedding ?? [];
  },

  async chat(messages: ChatMessageInput[]): Promise<string> {
    const input = messages.map((message) => ({
      role: message.role,
      content: message.content
    }));

    const response = await client.responses.create({
      model: env.OPENAI_CHAT_MODEL,
      instructions:
        "You are a helpful personal workspace assistant. Answer clearly and use the conversation history when relevant.",
      input
    });

    return getOutputText(response);
  }
};
