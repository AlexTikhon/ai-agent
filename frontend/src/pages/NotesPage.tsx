import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { NoteEditor } from "../components/notes/NoteEditor";
import { NoteCard } from "../components/notes/NoteCard";
import { Note } from "../types/models";

// Handles NotesPage logic.
export const NotesPage = () => {
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ note: Note; score: number }[]>([]);

  const notesQuery = useQuery({
    queryKey: ["notes"],
    queryFn: async () => (await api.get<Note[]>("/notes")).data
  });

  const createMutation = useMutation({
    mutationFn: (payload: { title: string; content: string }) => api.post("/notes", payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] })
  });

  const summarizeMutation = useMutation({
    mutationFn: (id: string) => api.post(`/notes/${id}/summarize`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] })
  });

  const searchMutation = useMutation({
    mutationFn: async (query: string) =>
      (await api.get<{ note: Note; score: number }[]>(`/notes/search?query=${encodeURIComponent(query)}`))
        .data,
    onSuccess: (data) => setSearchResults(data)
  });

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">AI Notes</h2>
      <NoteEditor onCreate={async (payload) => createMutation.mutateAsync(payload).then(() => undefined)} />
      <div className="card flex gap-2">
        <input
          className="border rounded-lg p-2 flex-1"
          placeholder="Semantic search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button className="bg-ink text-white rounded-lg px-4" onClick={() => searchMutation.mutate(searchQuery)}>
          Search
        </button>
      </div>

      {searchResults.length > 0 && (
        <div className="card">
          <h3 className="font-semibold mb-2">Search results</h3>
          <div className="space-y-2">
            {searchResults.map((row) => (
              <div key={row.note.id} className="border rounded-lg p-2">
                <p className="font-medium">{row.note.title}</p>
                <p className="text-sm text-slate-600">Score: {row.score.toFixed(3)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {(notesQuery.data || []).map((note) => (
          <NoteCard key={note.id} note={note} onSummarize={(id) => summarizeMutation.mutateAsync(id).then(() => undefined)} />
        ))}
      </div>
    </div>
  );
};
