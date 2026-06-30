"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

export function useSubmitBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (items: string[]) => api.submitJob(items),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}
