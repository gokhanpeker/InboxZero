"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { isAuthenticated } from "@/lib/auth";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <p className="text-sm text-slate-500" aria-live="polite">
        Checking session...
      </p>
    );
  }

  return <>{children}</>;
}
