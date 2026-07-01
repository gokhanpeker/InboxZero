"use client";

import { useEffect, useState } from "react";

/** Re-render on an interval so time-based UI (e.g. stale item actions) can update. */
export function useTicker(intervalMs = 15_000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return now;
}
