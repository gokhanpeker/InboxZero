"use client";

import Link from "next/link";

import { RequireAuth } from "@/components/RequireAuth";
import { StatusBadge } from "@/components/StatusBadge";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { JobProgressBar } from "@/components/ui/JobProgressBar";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { useJobs } from "@/hooks/useJobs";
import { getDisplayMessage } from "@/lib/api-error";

export default function JobsPage() {
  return (
    <RequireAuth>
      <JobsList />
    </RequireAuth>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function JobsList() {
  const { data, isLoading, isError, error } = useJobs();

  if (isLoading) {
    return <LoadingState message="Loading your jobs..." />;
  }

  if (isError) {
    return <Alert>{getDisplayMessage(error)}</Alert>;
  }

  if (!data?.length) {
    return (
      <div className="space-y-6">
        <PageHeader title="Jobs" description="Track batch processing status and AI results." />
        <EmptyState
          title="No jobs yet"
          description="Submit a batch of support messages to start AI triage. Each job shows live progress as items are processed."
          actionLabel="Submit your first batch"
          actionHref="/submit"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Jobs"
        description="Track batch processing status and AI results."
        action={<ButtonLink href="/submit">Submit batch</ButtonLink>}
      />

      <div className="card overflow-hidden">
        <div className="hidden md:block">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Job</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Progress</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((job) => (
                <tr key={job.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-4 font-medium text-slate-900">
                    <Link href={`/jobs/${job.id}`} className="hover:underline">
                      Job #{job.id}
                    </Link>
                    <p className="mt-0.5 text-xs font-normal text-slate-500">
                      {job.total_items} message{job.total_items === 1 ? "" : "s"}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={job.status} />
                  </td>
                  <td className="min-w-[200px] px-4 py-4">
                    <JobProgressBar done={job.done} failed={job.failed} total={job.total_items} />
                  </td>
                  <td className="px-4 py-4 text-slate-600">{formatDate(job.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-slate-100 md:hidden">
          {data.map((job) => (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className="block space-y-3 px-4 py-4 hover:bg-slate-50"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-slate-900">Job #{job.id}</span>
                <StatusBadge status={job.status} />
              </div>
              <JobProgressBar done={job.done} failed={job.failed} total={job.total_items} />
              <p className="text-xs text-slate-500">{formatDate(job.created_at)}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
