"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { Toast } from "@/components/ErrorToast";
import { ItemDetailModal } from "@/components/ItemDetailModal";
import { RequireAuth } from "@/components/RequireAuth";
import { StatusBadge } from "@/components/StatusBadge";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { JobProgressBar } from "@/components/ui/JobProgressBar";
import { LoadingState } from "@/components/ui/LoadingState";
import { useJob, useJobItems } from "@/hooks/useJobs";
import { useRetryItem } from "@/hooks/useRetryItem";
import { useTicker } from "@/hooks/useTicker";
import { getDisplayMessage } from "@/lib/api-error";
import { isStuckItem } from "@/lib/item-stale";
import type { ItemResponse } from "@/lib/types";

type ToastState = {
  message: string;
  variant: "error" | "success";
} | null;

export default function JobDetailPage() {
  return (
    <RequireAuth>
      <JobDetail />
    </RequireAuth>
  );
}

function JobDetail() {
  const params = useParams<{ id: string }>();
  const jobId = Number(params.id);
  const [toast, setToast] = useState<ToastState>(null);
  const [detailItem, setDetailItem] = useState<ItemResponse | null>(null);
  const jobQuery = useJob(jobId);
  const itemsQuery = useJobItems(jobId, jobQuery.data?.status);
  const retryItem = useRetryItem(jobId);
  const now = useTicker();

  if (!Number.isFinite(jobId)) {
    return <Alert>Invalid job id.</Alert>;
  }

  if (jobQuery.isLoading) {
    return <LoadingState message="Loading job details..." />;
  }

  if (jobQuery.isError) {
    return <Alert>{getDisplayMessage(jobQuery.error)}</Alert>;
  }

  const job = jobQuery.data;
  if (!job) {
    return null;
  }

  const isLive = job.status === "processing";

  async function handleRetry(itemId: number) {
    setToast(null);
    try {
      await retryItem.mutateAsync(itemId);
      setToast({ message: "Item queued for retry.", variant: "success" });
    } catch (error) {
      setToast({ message: getDisplayMessage(error), variant: "error" });
    }
  }

  function canRetry(item: ItemResponse): boolean {
    return item.status === "failed" || isStuckItem(item, now);
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/jobs"
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← Back to jobs
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Job #{job.id}
          </h1>
          <StatusBadge status={job.status} />
          {isLive && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
              Live updating
            </span>
          )}
        </div>
        <p className="mt-2 text-sm text-slate-600">
          {job.total_items} message{job.total_items === 1 ? "" : "s"} in this batch.
        </p>
      </div>

      <div className="card p-5">
        <JobProgressBar done={job.done} failed={job.failed} total={job.total_items} />
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Queued" value={job.queued} />
          <StatCard label="Processing" value={job.processing} />
          <StatCard label="Done" value={job.done} />
          <StatCard label="Failed" value={job.failed} />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900">Messages</h2>
        <p className="mt-1 text-sm text-slate-600">
          AI category, priority, and draft replies appear when processing completes.
        </p>

        {itemsQuery.isLoading && (
          <div className="mt-4">
            <LoadingState message="Loading messages..." />
          </div>
        )}

        {itemsQuery.isError && (
          <div className="mt-4">
            <Alert>{getDisplayMessage(itemsQuery.error)}</Alert>
          </div>
        )}

        {itemsQuery.data && (
          <div className="card mt-4 overflow-x-auto">
            <table className="min-w-[720px] divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Message</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Triage</th>
                  <th className="px-4 py-3 font-medium">Summary</th>
                  <th className="px-4 py-3 font-medium">Draft reply</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {itemsQuery.data.map((item) => (
                  <tr key={item.id} className="align-top hover:bg-slate-50/50">
                    <td className="max-w-[220px] px-4 py-3">
                      <p className="line-clamp-3 text-slate-900" title={item.input_text}>
                        {item.input_text}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status} />
                      {item.error && (
                        <p className="mt-2 text-xs leading-relaxed text-red-700">{item.error}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {item.category ? (
                        <div className="space-y-1">
                          <p className="capitalize">{item.category}</p>
                          <p className="text-xs text-slate-500">
                            {item.priority ?? "—"} · {item.sentiment ?? "—"}
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="max-w-[200px] px-4 py-3 text-slate-700">
                      <p className="line-clamp-3" title={item.summary ?? undefined}>
                        {item.summary ?? "—"}
                      </p>
                    </td>
                    <td className="max-w-[220px] px-4 py-3 text-slate-700">
                      <p className="line-clamp-4" title={item.suggested_reply ?? undefined}>
                        {item.suggested_reply ?? "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {item.status === "done" && (
                        <Button
                          variant="secondary"
                          onClick={() => setDetailItem(item)}
                          className="whitespace-nowrap px-3 py-1.5 text-xs"
                        >
                          Detail
                        </Button>
                      )}
                      {canRetry(item) && (
                        <Button
                          variant="secondary"
                          onClick={() => handleRetry(item.id)}
                          disabled={retryItem.isPending}
                          className="whitespace-nowrap px-3 py-1.5 text-xs"
                        >
                          Retry
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detailItem && (
        <ItemDetailModal item={detailItem} onClose={() => setDetailItem(null)} />
      )}

      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-3 text-center">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
