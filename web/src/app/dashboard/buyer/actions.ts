"use server";

import { randomUUID } from "crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { initializeTransaction } from "@/lib/paystack";
import { isDisputeReason } from "@/lib/disputes";
import type { FormState } from "@/types";

// The address the buyer is using right now (localhost while testing, the live
// domain in production), so Paystack always sends them back to the same place.
async function currentSiteUrl() {
  const h = await headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "")
    .split(",")[0]
    .trim();

  if (!host) return process.env.NEXT_PUBLIC_SITE_URL ?? "";

  const forwardedProto = (h.get("x-forwarded-proto") ?? "").split(",")[0].trim();
  const proto =
    forwardedProto ||
    (host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");

  return `${proto}://${host}`;
}

export async function payForOrder(formData: FormData) {
  const { user } = await requireRole(["buyer"]);
  const orderId = String(formData.get("order_id") ?? "");

  // RLS guarantees a buyer can only read their own orders
  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, status, total_amount")
    .eq("id", orderId)
    .eq("buyer_id", user.id)
    .maybeSingle();

  if (!order || order.status !== "pending" || !user.email) {
    redirect("/dashboard/buyer?payment=error");
  }

  const reference = `fd_${randomUUID()}`;
  const admin = createAdminClient();
  const { error } = await admin.from("payments").insert({
    order_id: order.id,
    reference,
    amount_kobo: Math.round(Number(order.total_amount) * 100),
  });

  if (error) redirect("/dashboard/buyer?payment=error");

  const siteUrl = await currentSiteUrl();

  let checkoutUrl: string;
  try {
    const tx = await initializeTransaction({
      email: user.email,
      amountKobo: Math.round(Number(order.total_amount) * 100),
      reference,
      callbackUrl: `${siteUrl}/payment/callback`,
    });
    checkoutUrl = tx.authorization_url;
  } catch {
    redirect("/dashboard/buyer?payment=error");
  }

  redirect(checkoutUrl);
}

export async function confirmReceipt(formData: FormData) {
  await requireRole(["buyer"]);
  const orderId = String(formData.get("order_id") ?? "");
  if (!orderId) redirect("/dashboard/buyer");

  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_order", {
    p_order_id: orderId,
  });

  revalidatePath("/dashboard/buyer");
  revalidatePath("/dashboard/farmer");
  revalidatePath("/admin");

  if (error) redirect("/dashboard/buyer?receipt=error");
  redirect("/dashboard/buyer?receipt=done");
}

export async function openDispute(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const { user } = await requireRole(["buyer"]);

  const orderId = String(formData.get("order_id") ?? "");
  const reason = String(formData.get("reason") ?? "");
  const details = String(formData.get("details") ?? "").trim();
  const rawPaths = String(formData.get("photo_paths") ?? "[]");

  if (!orderId) return { error: "Missing order." };
  if (!isDisputeReason(reason)) return { error: "Choose what went wrong." };
  if (details.length < 10 || details.length > 1000)
    return { error: "Describe the problem in 10 to 1000 characters." };

  let photoPaths: string[] = [];
  try {
    const parsed: unknown = JSON.parse(rawPaths);
    if (Array.isArray(parsed)) {
      photoPaths = parsed
        .filter((p): p is string => typeof p === "string")
        .slice(0, 3);
    }
  } catch {
    photoPaths = [];
  }
  if (photoPaths.some((p) => !p.startsWith(`${user.id}/`))) {
    return { error: "Invalid photo. Please upload it again." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("open_dispute", {
    p_order_id: orderId,
    p_reason: reason,
    p_details: details,
    p_photo_paths: photoPaths,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/buyer");
  revalidatePath("/dashboard/farmer");
  revalidatePath("/admin");
  redirect("/dashboard/buyer?dispute=opened");
}