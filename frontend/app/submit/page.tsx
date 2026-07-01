"use client";

import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useMemo, useState } from "react";

import { RequireAuth } from "@/components/RequireAuth";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { useSubmitBatch } from "@/hooks/useSubmitBatch";
import { getDisplayMessage } from "@/lib/api-error";
import {
  BatchParseError,
  MAX_BATCH_SIZE,
  parseTextareaInput,
  readUploadedFile,
} from "@/lib/batch-parse";

const SAMPLE_MESSAGES = `I was charged twice for my subscription this month
The export button crashes when I upload a large CSV FAIL
Can you add dark mode to the dashboard?
Love the new onboarding flow — great work!`;

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

  const lineCount = useMemo(() => {
    if (!textareaValue.trim()) {
      return 0;
    }
    return textareaValue.split(/\r?\n/).filter((line) => line.trim()).length;
  }, [textareaValue]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setError(null);
  }

  function clearFile() {
    setSelectedFile(null);
    setError(null);
  }

  function loadSample() {
    setTextareaValue(SAMPLE_MESSAGES);
    setSelectedFile(null);
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

  const canSubmit =
    !submitBatch.isPending && (selectedFile !== null || textareaValue.trim().length > 0);

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader
        title="Submit batch"
        description="Paste support messages or upload a file. Processing starts immediately — you can track progress on the job page."
      />

      <Alert variant="info">
        <strong className="font-medium">How it works:</strong> one message per line in the text box,
        or upload <code className="rounded bg-sky-100 px-1">.txt</code> /{" "}
        <code className="rounded bg-sky-100 px-1">.csv</code>. Max {MAX_BATCH_SIZE} messages per
        batch. Include <code className="rounded bg-sky-100 px-1">FAIL</code> in a message to
        simulate a processing error for demos.
      </Alert>

      <form className="card space-y-6 p-6" onSubmit={handleSubmit}>
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="file" className="text-sm font-medium text-slate-700">
              File upload
            </label>
            {selectedFile && (
              <button
                type="button"
                onClick={clearFile}
                className="text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Remove file
              </button>
            )}
          </div>
          <input
            id="file"
            type="file"
            accept=".txt,.csv,text/plain,text/csv"
            onChange={handleFileChange}
            className="mt-2 block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
          />
          {selectedFile ? (
            <p className="mt-2 text-xs text-emerald-700">
              Using file: <span className="font-medium">{selectedFile.name}</span> (textarea
              disabled)
            </p>
          ) : (
            <p className="mt-2 text-xs text-slate-500">Optional — takes priority over the text box.</p>
          )}
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="messages" className="text-sm font-medium text-slate-700">
              Messages
            </label>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>
                {selectedFile ? "—" : `${lineCount} / ${MAX_BATCH_SIZE} messages`}
              </span>
              {!selectedFile && (
                <button
                  type="button"
                  onClick={loadSample}
                  className="font-medium text-slate-700 hover:text-slate-900"
                >
                  Load sample
                </button>
              )}
            </div>
          </div>
          <textarea
            id="messages"
            rows={10}
            value={textareaValue}
            onChange={(event) => setTextareaValue(event.target.value)}
            placeholder={`Billing issue with my last invoice\nApp crashes when I click Export\nFeature request: dark mode`}
            disabled={Boolean(selectedFile)}
            className="input-field mt-2 font-mono text-[13px] leading-relaxed"
          />
        </div>

        {error && <Alert>{error}</Alert>}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={!canSubmit}>
            {submitBatch.isPending ? "Submitting..." : "Submit batch"}
          </Button>
          <p className="text-xs text-slate-500">You will be redirected to the job detail page.</p>
        </div>
      </form>
    </div>
  );
}
