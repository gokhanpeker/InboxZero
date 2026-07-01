"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { clearToken, isAuthenticated } from "@/lib/auth";

const AUTH_ROUTES = ["/login", "/register"];

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-md bg-slate-100 px-3 py-1.5 text-slate-900"
          : "px-3 py-1.5 text-slate-600 hover:text-slate-900"
      }
    >
      {children}
    </Link>
  );
}

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
            <Link href="/jobs" className="text-lg font-semibold tracking-tight text-slate-900">
              InboxZero
            </Link>
            <nav className="flex items-center gap-1 text-sm font-medium">
              {authenticated ? (
                <>
                  <NavLink href="/submit">Submit batch</NavLink>
                  <NavLink href="/jobs">Jobs</NavLink>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="px-3 py-1.5 text-slate-600 hover:text-slate-900"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <NavLink href="/login">Sign in</NavLink>
              )}
            </nav>
          </div>
        </header>
      )}
      <main
        className={
          isAuthRoute
            ? "mx-auto flex min-h-screen max-w-md items-center px-4 py-8"
            : "mx-auto max-w-6xl px-4 py-8 sm:px-6"
        }
      >
        {children}
      </main>
    </div>
  );
}
