import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const BASE = "https://api.paystack.co";

function authHeaders() {
  return {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    "Content-Type": "application/json",
  };
}

export async function initializeTransaction(input: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
}) {
  const res = await fetch(`${BASE}/transaction/initialize`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      email: input.email,
      amount: input.amountKobo,
      reference: input.reference,
      callback_url: input.callbackUrl,
      currency: "NGN",
    }),
  });
  const json = await res.json();
  if (!res.ok || !json.status) {
    throw new Error(json.message ?? "Could not start payment");
  }
  return json.data as { authorization_url: string; reference: string };
}

export async function confirmPayment(reference: string) {
  const res = await fetch(
    `${BASE}/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: authHeaders(), cache: "no-store" }
  );
  const json = await res.json();

  if (!res.ok || !json.status) {
    return { ok: false, message: json.message ?? "Could not verify payment" };
  }

  const tx = json.data;
  if (tx.status !== "success" || tx.currency !== "NGN") {
    return { ok: false, message: "Payment was not successful" };
  }

  const admin = createAdminClient();
  const { error } = await admin.rpc("mark_order_paid", {
    p_reference: reference,
    p_amount_kobo: tx.amount,
  });
  if (error) return { ok: false, message: error.message };

  return { ok: true, message: "Paid" };
}