"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { initializeTransaction } from "@/lib/paystack";

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

  let checkoutUrl: string;
  try {
    const tx = await initializeTransaction({
      email: user.email,
      amountKobo: Math.round(Number(order.total_amount) * 100),
      reference,
      callbackUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/payment/callback`,
    });
    checkoutUrl = tx.authorization_url;
  } catch {
    redirect("/dashboard/buyer?payment=error");
  }

  redirect(checkoutUrl);
}