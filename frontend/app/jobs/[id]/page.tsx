"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { RequireAuth } from "@/components/RequireAuth";
import { StatusBadge } from "@/components/StatusBadge";
import { useJob, useJobItems } from "@/hooks/useJobs";
import { getDisplayMessage } from "@/lib/api-error";

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
  const jobQuery = useJob(jobId);
  const itemsQuery = useJobItems(jobId, jobQuery.data?.status);

  if (!Number.isFinite(jobId)) {
    return <p className="text-sm text-red-700">Invalid job id.</p>;
  }

  if (jobQuery.isLoading) {
    return <p className="text-sm text-slate-500">Loading job...</p>;
  }

  if (jobQuery.isError) {
    return (
      <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
        {getDisplayMessage(jobQuery.error)}
      </p>
    );
  }

  const job = jobQuery.data;
  if (!job) {
    return null;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/jobs" className="text-sm text-slate-600 hover:text-slate-900">
            Back to jobs
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Job #{job.id}</h1>
        </div>
        <StatusBadge status={job.status} />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <StatCard label="Queued" value={job.queued} />
        <StatCard label="Processing" value={job.processing} />
        <StatCard label="Done" value={job.done} />
        <StatCard label="Failed" value={job.failed} />
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">Items</h2>

        {itemsQuery.isLoading && (
          <p className="mt-4 text-sm text-slate-500">Loading items...</p>
        )}

        {itemsQuery.isError && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {getDisplayMessage(itemsQuery.error)}
          </p>
        )}

        {itemsQuery.data && (
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Message</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Priority</th>
                  <th className="px-4 py-3 font-medium">Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {itemsQuery.data.map((item) => (
                  <tr key={item.id} className="align-top">
                    <td className="max-w-xs px-4 py-3 text-slate-900">{item.input_text}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status} />
                      {item.error && (
                        <p className="mt-2 text-xs text-red-700">{item.error}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{item.category ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-700">{item.priority ?? "—"}</td>
                    <td className="max-w-sm px-4 py-3 text-slate-700">{item.summary ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
