"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

export function useRetryItem(jobId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: number) => api.retryItem(itemId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["job", jobId] }),
        queryClient.invalidateQueries({ queryKey: ["job", jobId, "items"] }),
        queryClient.invalidateQueries({ queryKey: ["jobs"] }),
      ]);
    },
  });
}
