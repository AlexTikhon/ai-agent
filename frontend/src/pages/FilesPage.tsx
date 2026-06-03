import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { FileUploader } from "../components/files/FileUploader";
import { EmptyState, ErrorState, LoadingState, getErrorMessage } from "../components/ui/Status";
import { UserFile } from "../types/models";

// Handles FilesPage logic.
export const FilesPage = () => {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<{ file: UserFile; score: number }[]>([]);

  const filesQuery = useQuery({
    queryKey: ["files"],
    queryFn: async () => (await api.get<UserFile[]>("/files")).data
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      await api.post("/files/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["files"] })
  });

  const searchMutation = useMutation({
    mutationFn: async (value: string) =>
      (await api.get<{ file: UserFile; score: number }[]>(`/files/search?query=${encodeURIComponent(value)}`)).data,
    onSuccess: (data) => setResults(data)
  });

  const files = filesQuery.data || [];
  const canSearch = Boolean(query.trim()) && !searchMutation.isPending;

  // Handles runSearch logic.
  const runSearch = () => {
    if (!canSearch) return;
    setHasSearched(true);
    setResults([]);
    searchMutation.mutate(query.trim());
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">File Intelligence</h2>
      <FileUploader isPending={uploadMutation.isPending} onUpload={async (file) => uploadMutation.mutateAsync(file)} />
      {uploadMutation.isError && (
        <ErrorState title="Upload failed" message={getErrorMessage(uploadMutation.error)} />
      )}

      <div className="card flex gap-2">
        <input
          className="border rounded-lg p-2 flex-1"
          value={query}
          disabled={searchMutation.isPending}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") runSearch();
          }}
          placeholder="Search similar files by meaning"
        />
        <button className="bg-ink text-white rounded-lg px-4" disabled={!canSearch} onClick={runSearch}>
          {searchMutation.isPending ? "Searching..." : "Search"}
        </button>
      </div>

      {searchMutation.isError && (
        <ErrorState title="Search failed" message={getErrorMessage(searchMutation.error)} />
      )}
      {searchMutation.isPending && (
        <LoadingState title="Searching files" message="Embedding your query and comparing it with uploaded PDFs." />
      )}
      {hasSearched && searchMutation.isSuccess && results.length === 0 && (
        <EmptyState title="No similar files" message="Try another phrase or upload more PDFs." />
      )}
      {results.length > 0 && (
        <div className="card">
          <h3 className="font-semibold">Similar files</h3>
          <div className="space-y-2 mt-2">
            {results.map((row) => (
              <div key={row.file.id} className="border rounded-lg p-2">
                <p className="font-medium">{row.file.fileName}</p>
                <p className="text-sm text-slate-600">Score: {row.score.toFixed(3)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {filesQuery.isLoading && <LoadingState title="Loading files" />}
      {filesQuery.isError && (
        <ErrorState title="Could not load files" message={getErrorMessage(filesQuery.error)} />
      )}
      {filesQuery.isSuccess && files.length === 0 && (
        <EmptyState title="No files yet" message="Upload a PDF to make it searchable by meaning." />
      )}
      {files.length > 0 && (
        <div className="grid gap-3">
          {files.map((file) => (
            <article key={file.id} className="card">
              <h3 className="font-semibold">{file.fileName}</h3>
              <p className="text-sm text-slate-600 mt-2">{file.summary || "No summary available yet."}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
