import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type Role = "farmer" | "buyer" | "admin";

const homeFor: Record<Role, string> = {
  farmer: "/dashboard/farmer",
  buyer: "/dashboard/buyer",
  admin: "/admin",
};

type SessionUser = { id: string; email: string | null };

type Session = {
  user: SessionUser;
  profile: { full_name: string | null; role: Role };
};

// One lookup per request, shared by the navbar, layouts and pages
const loadSession = cache(async (): Promise<Session | null> => {
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", claims.sub)
    .maybeSingle();

  if (!profile) return null;

  const email = (claims as { email?: unknown }).email;

  return {
    user: {
      id: claims.sub,
      email: typeof email === "string" ? email : null,
    },
    profile: {
      full_name: (profile.full_name as string | null) ?? null,
      role: profile.role as Role,
    },
  };
});

export async function requireRole(allowed: Role[]) {
  await connection();

  const session = await loadSession();
  if (!session) redirect("/login");

  const role = session.profile.role;
  if (!allowed.includes(role)) redirect(homeFor[role] ?? "/");

  return session;
}

export async function getCurrentUser() {
  await connection();

  const session = await loadSession();
  if (!session) return null;

  return { user: session.user, role: session.profile.role as Role | null };
}