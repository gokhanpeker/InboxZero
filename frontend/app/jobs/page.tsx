"use client";

import Link from "next/link";

import { RequireAuth } from "@/components/RequireAuth";
import { StatusBadge } from "@/components/StatusBadge";
import { useJobs } from "@/hooks/useJobs";
import { getDisplayMessage } from "@/lib/api-error";

export default function JobsPage() {
  return (
    <RequireAuth>
      <JobsList />
    </RequireAuth>
  );
}

function JobsList() {
  const { data, isLoading, isError, error } = useJobs();

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading jobs...</p>;
  }

  if (isError) {
    return (
      <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
        {getDisplayMessage(error)}
      </p>
    );
  }

  if (!data?.length) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Jobs</h1>
        <p className="mt-4 text-sm text-slate-600">
          No jobs yet.{" "}
          <Link href="/submit" className="font-medium text-slate-900 hover:underline">
            Submit your first batch
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-slate-900">Jobs</h1>
        <Link
          href="/submit"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Submit batch
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Job</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Items</th>
              <th className="px-4 py-3 font-medium">Progress</th>
              <th className="px-4 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((job) => (
              <tr key={job.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">
                  <Link href={`/jobs/${job.id}`} className="hover:underline">
                    #{job.id}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={job.status} />
                </td>
                <td className="px-4 py-3 text-slate-700">{job.total_items}</td>
                <td className="px-4 py-3 text-slate-700">
                  {job.done} done / {job.failed} failed / {job.processing} processing /{" "}
                  {job.queued} queued
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {new Date(job.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
