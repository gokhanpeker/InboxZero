"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { clearToken, isAuthenticated } from "@/lib/auth";

const AUTH_ROUTES = ["/login", "/register"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  useEffect(() => {
    setAuthenticated(isAuthenticated());
  }, [pathname]);

  function handleSignOut() {
    clearToken();
    setAuthenticated(false);
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {!isAuthRoute && (
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <Link href="/jobs" className="text-lg font-semibold tracking-tight">
              InboxZero
            </Link>
            <nav className="flex items-center gap-4 text-sm font-medium text-slate-600">
              {authenticated ? (
                <>
                  <Link href="/submit" className="hover:text-slate-900">
                    Submit batch
                  </Link>
                  <Link href="/jobs" className="hover:text-slate-900">
                    Jobs
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="hover:text-slate-900"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <Link href="/login" className="hover:text-slate-900">
                  Sign in
                </Link>
              )}
            </nav>
          </div>
        </header>
      )}
      <main
        className={
          isAuthRoute
            ? "mx-auto flex min-h-screen max-w-md items-center px-4 py-8"
            : "mx-auto max-w-6xl px-4 py-8"
        }
      >
        {children}
      </main>
    </div>
  );
}
