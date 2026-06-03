import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { FileUploader } from "../components/files/FileUploader";
import { UserFile } from "../types/models";

// Handles FilesPage logic.
export const FilesPage = () => {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
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

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">File Intelligence</h2>
      <FileUploader onUpload={async (file) => uploadMutation.mutateAsync(file)} />
      <div className="card flex gap-2">
        <input
          className="border rounded-lg p-2 flex-1"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search similar files by meaning"
        />
        <button className="bg-ink text-white rounded-lg px-4" onClick={() => searchMutation.mutate(query)}>
          Search
        </button>
      </div>

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

      <div className="grid gap-3">
        {(filesQuery.data || []).map((file) => (
          <article key={file.id} className="card">
            <h3 className="font-semibold">{file.fileName}</h3>
            <p className="text-sm text-slate-600 mt-2">{file.summary}</p>
          </article>
        ))}
      </div>
    </div>
  );
};
