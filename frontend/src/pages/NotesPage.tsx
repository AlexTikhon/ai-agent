import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { NoteEditor } from "../components/notes/NoteEditor";
import { NoteCard } from "../components/notes/NoteCard";
import { EmptyState, ErrorState, LoadingState, getErrorMessage } from "../components/ui/Status";
import { Note } from "../types/models";

// Handles NotesPage logic.
export const NotesPage = () => {
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
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

  const notes = notesQuery.data || [];
  const canSearch = Boolean(searchQuery.trim()) && !searchMutation.isPending;

  // Handles runSearch logic.
  const runSearch = () => {
    if (!canSearch) return;
    setHasSearched(true);
    setSearchResults([]);
    searchMutation.mutate(searchQuery.trim());
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">AI Notes</h2>
      <NoteEditor
        isPending={createMutation.isPending}
        onCreate={async (payload) => createMutation.mutateAsync(payload).then(() => undefined)}
      />
      {createMutation.isError && (
        <ErrorState title="Could not save note" message={getErrorMessage(createMutation.error)} />
      )}

      <div className="card flex gap-2">
        <input
          className="border rounded-lg p-2 flex-1"
          placeholder="Semantic search..."
          value={searchQuery}
          disabled={searchMutation.isPending}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") runSearch();
          }}
        />
        <button className="bg-ink text-white rounded-lg px-4" disabled={!canSearch} onClick={runSearch}>
          {searchMutation.isPending ? "Searching..." : "Search"}
        </button>
      </div>

      {searchMutation.isError && (
        <ErrorState title="Search failed" message={getErrorMessage(searchMutation.error)} />
      )}
      {searchMutation.isPending && (
        <LoadingState title="Searching notes" message="Embedding your query and ranking matching notes." />
      )}
      {hasSearched && searchMutation.isSuccess && searchResults.length === 0 && (
        <EmptyState title="No matching notes" message="Try a broader phrase or create notes with more detail." />
      )}
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

      {notesQuery.isLoading && <LoadingState title="Loading notes" />}
      {notesQuery.isError && (
        <ErrorState title="Could not load notes" message={getErrorMessage(notesQuery.error)} />
      )}
      {summarizeMutation.isError && (
        <ErrorState title="Could not summarize note" message={getErrorMessage(summarizeMutation.error)} />
      )}
      {notesQuery.isSuccess && notes.length === 0 && (
        <EmptyState title="No notes yet" message="Create a note above to start building workspace memory." />
      )}
      {notes.length > 0 && (
        <div className="grid gap-3">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              isSummarizing={summarizeMutation.isPending && summarizeMutation.variables === note.id}
              onSummarize={(id) => summarizeMutation.mutateAsync(id).then(() => undefined)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
