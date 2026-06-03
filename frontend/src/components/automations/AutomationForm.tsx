import { FormEvent, useState } from "react";

type Props = {
  isPending?: boolean;
  onCreate: (payload: { title: string; description?: string; cronExpr: string }) => Promise<void>;
};

// Handles AutomationForm logic.
export const AutomationForm = ({ isPending = false, onCreate }: Props) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cronExpr, setCronExpr] = useState("0 9 * * 1");
  const canSubmit = Boolean(title.trim() && cronExpr.trim()) && !isPending;

  // Handles submit logic.
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    await onCreate({
      title: title.trim(),
      description: description.trim() || undefined,
      cronExpr: cronExpr.trim()
    });
    setTitle("");
    setDescription("");
  };

  return (
    <form className="card grid md:grid-cols-3 gap-2" onSubmit={submit}>
      <input
        className="border rounded-lg p-2"
        placeholder="Task title"
        value={title}
        disabled={isPending}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        className="border rounded-lg p-2"
        placeholder="Description"
        value={description}
        disabled={isPending}
        onChange={(e) => setDescription(e.target.value)}
      />
      <input
        className="border rounded-lg p-2"
        placeholder="Cron expression"
        value={cronExpr}
        disabled={isPending}
        onChange={(e) => setCronExpr(e.target.value)}
      />
      <button className="bg-accent text-white rounded-lg p-2 md:col-span-3" disabled={!canSubmit}>
        {isPending ? "Creating..." : "Create automation"}
      </button>
    </form>
  );
};
