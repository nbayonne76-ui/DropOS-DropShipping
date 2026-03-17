"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { register } from "@/lib/api/auth";
import { useAppStore } from "@/store/appStore";

export default function RegisterPage() {
  const router = useRouter();
  const setTokens = useAppStore((s) => s.setTokens);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsLoading(true);
    try {
      await register({ full_name: fullName, email, password });
      // Auto-login after registration
      const { login } = await import("@/lib/api/auth");
      const tokens = await login({ email, password });
      setTokens(tokens.access_token, tokens.refresh_token);
      router.push("/overview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Create your account</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Start tracking profits in minutes — no credit card required.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-danger-50 border border-danger-200 px-4 py-3">
          <p className="text-sm font-medium text-danger-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="full_name" className="label-base">
            Full name
          </label>
          <input
            id="full_name"
            type="text"
            autoComplete="name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jane Smith"
            className="input-base"
          />
        </div>

        <div>
          <label htmlFor="email" className="label-base">
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="input-base"
          />
        </div>

        <div>
          <label htmlFor="password" className="label-base">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 8 characters"
            className="input-base"
          />
          <p className="mt-1 text-xs text-neutral-400">
            At least 8 characters.
          </p>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating account…
            </>
          ) : (
            "Create account"
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary-600 hover:text-primary-700">
          Sign in
        </Link>
      </p>

      <p className="mt-4 text-center text-xs text-neutral-400">
        By creating an account you agree to our{" "}
        <a href="/terms" className="underline hover:text-neutral-600">Terms</a>{" "}
        and{" "}
        <a href="/privacy" className="underline hover:text-neutral-600">Privacy Policy</a>.
      </p>
    </>
  );
}
