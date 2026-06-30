"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { JobSummary } from "@/lib/types";

export function useJobs() {
  return useQuery({
    queryKey: ["jobs"],
    queryFn: () => api.listJobs(),
  });
}

export function useJob(jobId: number) {
  return useQuery({
    queryKey: ["job", jobId],
    queryFn: () => api.getJob(jobId),
    refetchInterval: (query) => {
      const job = query.state.data as JobSummary | undefined;
      if (!job || job.status === "completed") {
        return false;
      }
      return 2000;
    },
  });
}

export function useJobItems(jobId: number, jobStatus?: string) {
  return useQuery({
    queryKey: ["job", jobId, "items"],
    queryFn: () => api.listJobItems(jobId),
    enabled: Number.isFinite(jobId),
    refetchInterval: () => (jobStatus === "completed" ? false : 2000),
  });
}
