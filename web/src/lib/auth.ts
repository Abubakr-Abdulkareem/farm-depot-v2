import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Role = "farmer" | "buyer" | "admin";

const homeFor: Record<Role, string> = {
  farmer: "/dashboard/farmer",
  buyer: "/dashboard/buyer",
  admin: "/admin",
};

export async function requireRole(allowed: Role[]) {
  await connection();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const role = profile.role as Role;
  if (!allowed.includes(role)) redirect(homeFor[role] ?? "/");

  return { user, profile };
}