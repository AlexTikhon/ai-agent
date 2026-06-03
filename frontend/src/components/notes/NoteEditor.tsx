import { FormEvent, useState } from "react";

type Props = {
  onCreate: (payload: { title: string; content: string }) => Promise<void>;
};

// Handles NoteEditor logic.
export const NoteEditor = ({ onCreate }: Props) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // Handles submit logic.
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;
    await onCreate({ title, content });
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
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className="border rounded-lg p-2 min-h-24"
        placeholder="Content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <button className="bg-accent text-white rounded-lg p-2">Save note</button>
    </form>
  );
};
