import { FormEvent, useState } from "react";

type Props = {
  onCreate: (payload: { title: string; description?: string; cronExpr: string }) => Promise<void>;
};

// Handles AutomationForm logic.
export const AutomationForm = ({ onCreate }: Props) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cronExpr, setCronExpr] = useState("0 9 * * 1");

  // Handles submit logic.
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await onCreate({ title, description, cronExpr });
    setTitle("");
    setDescription("");
  };

  return (
    <form className="card grid md:grid-cols-3 gap-2" onSubmit={submit}>
      <input
        className="border rounded-lg p-2"
        placeholder="Task title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        className="border rounded-lg p-2"
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <input
        className="border rounded-lg p-2"
        placeholder="Cron expression"
        value={cronExpr}
        onChange={(e) => setCronExpr(e.target.value)}
      />
      <button className="bg-accent text-white rounded-lg p-2 md:col-span-3">Create automation</button>
    </form>
  );
};
