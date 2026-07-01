import type { ItemResponse } from "@/lib/types";

/** Must match backend STALE_REQUEUE_SECONDS (default 120). */
export const STALE_REQUEUE_MS = 2 * 60 * 1000;

const STUCK_STATUSES = new Set(["queued", "processing"]);

export function isStuckItem(item: ItemResponse, nowMs: number): boolean {
  if (!STUCK_STATUSES.has(item.status)) {
    return false;
  }

  const updatedAt = new Date(item.updated_at).getTime();
  return nowMs - updatedAt >= STALE_REQUEUE_MS;
}
