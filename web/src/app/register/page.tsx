"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"farmer" | "buyer">("buyer");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

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
      setError("Check your email to confirm your account, then log in.");
      setLoading(false);
      return;
    }

    router.push(role === "farmer" ? "/dashboard/farmer" : "/dashboard/buyer");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="mb-6 text-2xl font-bold">Create your account</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          className="rounded border border-gray-600 bg-transparent p-2"
          placeholder="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
        <input
          className="rounded border border-gray-600 bg-transparent p-2"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="rounded border border-gray-600 bg-transparent p-2"
          type="password"
          placeholder="Password (min 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />
        <select
          className="rounded border border-gray-600 bg-transparent p-2"
          value={role}
          onChange={(e) => setRole(e.target.value as "farmer" | "buyer")}
        >
          <option value="buyer" className="text-black">I want to buy produce</option>
          <option value="farmer" className="text-black">I want to sell produce</option>
        </select>
        {error && <p className="text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-green-600 p-2 font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Sign up"}
        </button>
      </form>
    </main>
  );
}