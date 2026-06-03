import { Note } from "../../types/models";

type Props = {
  note: Note;
  onSummarize: (id: string) => Promise<void>;
};

// Handles NoteCard logic.
export const NoteCard = ({ note, onSummarize }: Props) => (
  <article className="card">
    <div className="flex items-start justify-between gap-3">
      <h3 className="text-lg font-semibold">{note.title}</h3>
      <button className="text-sm text-accent" onClick={() => onSummarize(note.id)}>
        Summarize
      </button>
    </div>
    <p className="text-sm mt-2 whitespace-pre-wrap">{note.content}</p>
    {note.summary && <p className="text-sm mt-3 text-slate-600">{note.summary}</p>}
    <div className="mt-3 flex gap-2 flex-wrap">
      {note.tags.map((tag) => (
        <span key={tag} className="text-xs bg-slate-100 px-2 py-1 rounded">
          #{tag}
        </span>
      ))}
    </div>
  </article>
);
