"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";

export async function openNotification(formData: FormData) {
  const { user } = await requireRole(["buyer", "farmer", "admin"]);

  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) redirect("/inbox");

  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, link, read_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) redirect("/inbox");

  if (!data.read_at) {
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);
  }

  revalidatePath("/inbox");

  // Only go to pages on this site
  const link = typeof data.link === "string" ? data.link : "";
  redirect(link.startsWith("/") && !link.startsWith("//") ? link : "/inbox");
}