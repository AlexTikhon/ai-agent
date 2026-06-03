import { FormEvent, useState } from "react";

type Props = {
  isPending?: boolean;
  onCreate: (payload: { title: string; content: string }) => Promise<void>;
};

// Handles NoteEditor logic.
export const NoteEditor = ({ isPending = false, onCreate }: Props) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const canSubmit = Boolean(title.trim() && content.trim()) && !isPending;

  // Handles submit logic.
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    await onCreate({ title: title.trim(), content: content.trim() });
    setTitle("");
    setContent("");
  };

  return (
    <form className="card flex flex-col gap-2" onSubmit={submit}>
      <h3 className="font-semibold">Create note</h3>
      <input
        className="border rounded-lg p-2"
        placeholder="Title"
        value={title}
        disabled={isPending}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className="border rounded-lg p-2 min-h-24"
        placeholder="Content"
        value={content}
        disabled={isPending}
        onChange={(e) => setContent(e.target.value)}
      />
      <button className="bg-accent text-white rounded-lg p-2" disabled={!canSubmit}>
        {isPending ? "Saving..." : "Save note"}
      </button>
    </form>
  );
};
