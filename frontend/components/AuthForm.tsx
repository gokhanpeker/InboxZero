"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { getDisplayMessage } from "@/lib/api-error";
import { setToken } from "@/lib/auth";

type AuthFormProps = {
  mode: "login" | "register";
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response =
        mode === "login"
          ? await api.login(email.trim().toLowerCase(), password)
          : await api.register(email.trim().toLowerCase(), password);
      setToken(response.access_token);
      router.push("/jobs");
    } catch (err) {
      setError(getDisplayMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const title = mode === "login" ? "Welcome back" : "Create your account";
  const submitLabel = mode === "login" ? "Sign in" : "Create account";
  const alternateHref = mode === "login" ? "/register" : "/login";
  const alternateText =
    mode === "login" ? "Need an account? Register" : "Already have an account? Sign in";

  return (
    <div className="card w-full p-8">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
      <p className="mt-2 text-sm text-slate-600">
        AI batch triage for support messages — classify, prioritize, and draft replies.
      </p>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="input-field mt-1.5"
            placeholder="you@company.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700">
            Password
          </label>
          {mode === "login" ? (
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="input-field mt-1.5"
              placeholder="Your password"
            />
          ) : (
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="input-field mt-1.5"
              placeholder="At least 8 characters"
            />
          )}
          {mode === "register" && (
            <p className="mt-1.5 text-xs text-slate-500">Minimum 8 characters.</p>
          )}
        </div>

        {error && <Alert>{error}</Alert>}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Please wait..." : submitLabel}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        <Link href={alternateHref} className="font-medium text-slate-900 hover:underline">
          {alternateText}
        </Link>
      </p>
    </div>
  );
}
