import { FormEvent, useState } from "react";

type Props = {
  onSend: (message: string) => void;
};

// Handles ChatInput logic.
export const ChatInput = ({ onSend }: Props) => {
  const [message, setMessage] = useState("");

  // Handles submit logic.
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    onSend(message);
    setMessage("");
  };

  return (
    <form className="card flex gap-2" onSubmit={submit}>
      <input
        className="border rounded-lg p-2 flex-1"
        placeholder="Ask AI..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <button className="bg-accent text-white rounded-lg px-4">Send</button>
    </form>
  );
};
