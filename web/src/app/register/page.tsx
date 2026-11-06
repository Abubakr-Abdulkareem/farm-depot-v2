"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  card,
  eyebrow,
  field,
  noticeBad,
  noticeWarn,
  primaryButton,
} from "@/lib/layout";

const roles = [
  {
    value: "buyer",
    title: "I want to buy",
    text: "Order produce in bulk for my business.",
  },
  {
    value: "farmer",
    title: "I want to sell",
    text: "List my produce and reach buyers.",
  },
] as const;

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"farmer" | "buyer">("buyer");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (!data.session) {
      setInfo("Check your email to confirm your account, then log in.");
      setLoading(false);
      return;
    }

    router.push(role === "farmer" ? "/dashboard/farmer" : "/dashboard/buyer");
    router.refresh();
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 py-12">
      <p className={eyebrow}>Join Farm Depot</p>
      <h1 className="mt-2 mb-6 text-3xl font-bold">Create your account</h1>

      <form onSubmit={handleSubmit} className={`${card} flex flex-col gap-4`}>
        <div className="grid grid-cols-2 gap-3">
          {roles.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRole(r.value)}
              className={`rounded-xl border p-3 text-left transition ${
                role === r.value
                  ? "border-lime-300 bg-lime-300/10"
                  : "border-white/15 hover:bg-white/5"
              }`}
            >
              <p className="font-semibold">{r.title}</p>
              <p className="mt-1 text-xs text-white/60">{r.text}</p>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="full_name" className="text-sm text-white/70">
            Full name
          </label>
          <input
            id="full_name"
            className={`${field} w-full`}
            placeholder="Your full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>

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
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </div>

        {error && <p className={noticeBad}>{error}</p>}
        {info && <p className={noticeWarn}>{info}</p>}

        <button type="submit" disabled={loading} className={primaryButton}>
          {loading ? "Creating account..." : "Sign up"}
        </button>
      </form>

      <p className="mt-4 text-sm text-white/60">
        Already have an account?{" "}
        <Link href="/login" className="text-lime-300 underline">
          Log in
        </Link>
      </p>
    </main>
  );
}