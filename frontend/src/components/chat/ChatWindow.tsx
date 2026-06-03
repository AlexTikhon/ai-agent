type Message = {
  role: string;
  content: string;
  id?: string;
};

type Props = {
  messages: Message[];
};

// Handles ChatWindow logic.
export const ChatWindow = ({ messages }: Props) => (
  <div className="card min-h-80 max-h-[60vh] overflow-auto flex flex-col gap-3">
    {messages.map((m, idx) => (
      <div
        key={m.id || idx}
        className={`rounded-lg p-3 ${m.role === "user" ? "bg-slate-100 ml-8" : "bg-teal-50 mr-8"}`}
      >
        <p className="text-xs uppercase text-slate-500 mb-1">{m.role}</p>
        <p>{m.content}</p>
      </div>
    ))}
  </div>
);
