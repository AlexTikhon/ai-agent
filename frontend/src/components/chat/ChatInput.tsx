import { FormEvent, useState } from "react";

type Props = {
  isPending?: boolean;
  onSend: (message: string) => void;
};

// Handles ChatInput logic.
export const ChatInput = ({ isPending = false, onSend }: Props) => {
  const [message, setMessage] = useState("");
  const canSubmit = Boolean(message.trim()) && !isPending;

  // Handles submit logic.
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSend(message.trim());
    setMessage("");
  };

  return (
    <form className="card flex gap-2" onSubmit={submit}>
      <input
        className="border rounded-lg p-2 flex-1"
        placeholder="Ask AI..."
        value={message}
        disabled={isPending}
        onChange={(e) => setMessage(e.target.value)}
      />
      <button className="bg-accent text-white rounded-lg px-4" disabled={!canSubmit}>
        {isPending ? "Sending..." : "Send"}
      </button>
    </form>
  );
};
