"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

function SignInForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        password,
        username: "user",
        redirect: false,
      });
      if (res?.error) {
        setError("Wrong password.");
        setLoading(false);
        return;
      }
      if (res?.ok) {
        window.location.href = callbackUrl;
        return;
      }
    } catch {
      setError("Something went wrong.");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm border border-gray-200 rounded-lg p-6 shadow-sm"
      >
        <h1 className="text-xl font-semibold mb-2">Pastorale Flower</h1>
        <p className="text-sm text-gray-500 mb-4">Sign in to continue</p>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          placeholder="Enter password"
          required
          autoFocus
        />
        {error && (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="mt-4 w-full bg-blue-600 text-white rounded-md py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center p-4">
          <div className="w-full max-w-sm border border-gray-200 rounded-lg p-6 shadow-sm animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-4 bg-gray-100 rounded w-1/2 mb-4" />
            <div className="h-10 bg-gray-100 rounded mb-4" />
            <div className="h-10 bg-gray-200 rounded" />
          </div>
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
