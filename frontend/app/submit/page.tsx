"use client";

import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useState } from "react";

import { RequireAuth } from "@/components/RequireAuth";
import { useSubmitBatch } from "@/hooks/useSubmitBatch";
import { getDisplayMessage } from "@/lib/api-error";
import {
  BatchParseError,
  MAX_BATCH_SIZE,
  parseTextareaInput,
  readUploadedFile,
} from "@/lib/batch-parse";

export default function SubmitPage() {
  return (
    <RequireAuth>
      <SubmitBatchForm />
    </RequireAuth>
  );
}

function SubmitBatchForm() {
  const router = useRouter();
  const submitBatch = useSubmitBatch();
  const [textareaValue, setTextareaValue] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      const items = selectedFile
        ? await readUploadedFile(selectedFile)
        : parseTextareaInput(textareaValue);

      const result = await submitBatch.mutateAsync(items);
      router.push(`/jobs/${result.id}`);
    } catch (err) {
      if (err instanceof BatchParseError) {
        setError(err.message);
        return;
      }
      setError(getDisplayMessage(err));
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-slate-900">Submit batch</h1>
      <p className="mt-2 text-sm text-slate-600">
        Paste messages or upload a .txt/.csv file. Up to {MAX_BATCH_SIZE} items per batch.
      </p>

      <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="file" className="block text-sm font-medium text-slate-700">
            File upload (optional)
          </label>
          <input
            id="file"
            type="file"
            accept=".txt,.csv,text/plain,text/csv"
            onChange={handleFileChange}
            className="mt-2 block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-700"
          />
          <p className="mt-2 text-xs text-slate-500">
            Upload takes priority over the textarea when both are provided.
          </p>
        </div>

        <div>
          <label htmlFor="messages" className="block text-sm font-medium text-slate-700">
            Messages
          </label>
          <textarea
            id="messages"
            rows={12}
            value={textareaValue}
            onChange={(event) => setTextareaValue(event.target.value)}
            placeholder="One message per line"
            disabled={Boolean(selectedFile)}
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2 disabled:bg-slate-100"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitBatch.isPending}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {submitBatch.isPending ? "Submitting..." : "Submit batch"}
        </button>
      </form>
    </div>
  );
}
