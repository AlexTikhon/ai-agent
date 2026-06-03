import { FormEvent, useState } from "react";

type Props = {
  onUpload: (file: File) => Promise<void>;
};

// Handles FileUploader logic.
export const FileUploader = ({ onUpload }: Props) => {
  const [file, setFile] = useState<File | null>(null);

  // Handles submit logic.
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;
    await onUpload(file);
    setFile(null);
  };

  return (
    <form className="card flex items-end gap-3" onSubmit={submit}>
      <div className="flex-1">
        <label className="text-sm text-slate-500">Upload PDF</label>
        <input
          className="block mt-1"
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
      </div>
      <button className="bg-accent text-white rounded-lg px-4 py-2">Upload</button>
    </form>
  );
};
