"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/types";

export async function startThread(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireRole(["buyer", "farmer"]);

  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const orderId = String(formData.get("order_id") ?? "").trim();

  if (subject.length < 3 || subject.length > 120)
    return { error: "The subject must be 3 to 120 characters." };
  if (body.length < 1 || body.length > 2000)
    return { error: "The message must be 1 to 2000 characters." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("start_support_thread", {
    p_subject: subject,
    p_order_id: orderId || null,
    p_body: body,
  });

  if (error || typeof data !== "string")
    return { error: error?.message ?? "Could not start the conversation." };

  revalidatePath("/support");
  revalidatePath("/admin/support");
  redirect(`/support/${data}`);
}

export async function postMessage(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireRole(["buyer", "farmer", "admin"]);

  const threadId = String(formData.get("thread_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  if (!threadId) return { error: "Missing conversation." };
  if (body.length < 1 || body.length > 2000)
    return { error: "The message must be 1 to 2000 characters." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("post_support_message", {
    p_thread_id: threadId,
    p_body: body,
  });

  if (error) return { error: error.message };

  revalidatePath(`/support/${threadId}`);
  revalidatePath("/support");
  revalidatePath("/admin/support");
  return { success: true };
}

export async function closeThread(formData: FormData) {
  await requireRole(["buyer", "farmer", "admin"]);

  const threadId = String(formData.get("thread_id") ?? "");
  if (!threadId) redirect("/support");

  const supabase = await createClient();
  const { error } = await supabase.rpc("close_support_thread", {
    p_thread_id: threadId,
  });
  if (error) console.error("Close conversation failed:", error.message);

  revalidatePath(`/support/${threadId}`);
  revalidatePath("/support");
  revalidatePath("/admin/support");
  redirect(`/support/${threadId}`);
}