"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { card, eyebrow, field, noticeBad, primaryButton } from "@/lib/layout";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      setError(error?.message ?? "Login failed");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    const role = profile?.role;
    router.push(
      role === "admin"
        ? "/admin"
        : role === "farmer"
        ? "/dashboard/farmer"
        : "/dashboard/buyer"
    );
    router.refresh();
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 py-12">
      <p className={eyebrow}>Welcome back</p>
      <h1 className="mt-2 mb-6 text-3xl font-bold">Log in</h1>

      <form onSubmit={handleSubmit} className={`${card} flex flex-col gap-4`}>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm text-white/70">
            Email
          </label>
          <input
            id="email"
            className={`${field} w-full`}
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm text-white/70">
            Password
          </label>
          <input
            id="password"
            className={`${field} w-full`}
            type="password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <p className={noticeBad}>{error}</p>}

        <button type="submit" disabled={loading} className={primaryButton}>
          {loading ? "Logging in..." : "Log in"}
        </button>
      </form>

      <p className="mt-4 text-sm text-white/60">
        New to Farm Depot?{" "}
        <Link href="/register" className="text-lime-300 underline">
          Create an account
        </Link>
      </p>
    </main>
  );
}