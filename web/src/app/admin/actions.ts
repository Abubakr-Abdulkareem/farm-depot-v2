"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function finish(error?: { message: string } | null): never {
  revalidatePath("/admin");
  revalidatePath("/dashboard/buyer");
  revalidatePath("/dashboard/farmer");
  if (error) redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  redirect("/admin");
}

export async function markPickedUp(formData: FormData) {
  await requireRole(["admin"]);
  const orderId = String(formData.get("order_id") ?? "");
  if (!orderId) redirect("/admin");

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_mark_picked_up", {
    p_order_id: orderId,
  });
  finish(error);
}

export async function markDelivered(formData: FormData) {
  await requireRole(["admin"]);
  const orderId = String(formData.get("order_id") ?? "");
  const code = String(formData.get("code") ?? "").trim();
  if (!orderId) redirect("/admin");
  if (!/^\d{4}$/.test(code)) {
    redirect(`/admin?error=${encodeURIComponent("Enter the 4-digit delivery code.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_mark_delivered", {
    p_order_id: orderId,
    p_code: code,
  });
  finish(error);
}

export async function completeOrder(formData: FormData) {
  await requireRole(["admin"]);
  const orderId = String(formData.get("order_id") ?? "");
  if (!orderId) redirect("/admin");

  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_order", {
    p_order_id: orderId,
  });
  finish(error);
}

export async function markPayoutPaid(formData: FormData) {
  await requireRole(["admin"]);
  const payoutId = String(formData.get("payout_id") ?? "");
  const reference = String(formData.get("reference") ?? "").trim();
  if (!payoutId) redirect("/admin");

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_mark_payout_paid", {
    p_payout_id: payoutId,
    p_reference: reference,
  });
  finish(error);
}