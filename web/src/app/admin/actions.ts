"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  notifyPickedUp,
  notifyDelivered,
  notifyPayoutPaid,
  notifyDisputeResolved,
  notifyRefundPaid,
} from "@/lib/notify";

const ORDERS = "/admin/orders";
const PAYOUTS = "/admin/payouts";
const DISPUTES = "/admin/disputes";

function finish(path: string, error?: { message: string } | null): never {
  revalidatePath("/admin", "layout");
  revalidatePath("/dashboard/buyer", "layout");
  revalidatePath("/dashboard/farmer", "layout");
  if (error) redirect(`${path}?error=${encodeURIComponent(error.message)}`);
  redirect(path);
}

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function markPickedUp(formData: FormData) {
  await requireRole(["admin"]);
  const orderId = String(formData.get("order_id") ?? "");
  if (!orderId) redirect(ORDERS);

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_mark_picked_up", {
    p_order_id: orderId,
  });
  if (!error) after(() => notifyPickedUp(orderId));
  finish(ORDERS, error);
}

export async function markDelivered(formData: FormData) {
  await requireRole(["admin"]);
  const orderId = String(formData.get("order_id") ?? "");
  const code = String(formData.get("code") ?? "").trim();
  if (!orderId) redirect(ORDERS);
  if (!/^\d{4}$/.test(code)) fail(ORDERS, "Enter the 4-digit delivery code.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_mark_delivered", {
    p_order_id: orderId,
    p_code: code,
  });
  if (!error) after(() => notifyDelivered(orderId));
  finish(ORDERS, error);
}

export async function completeOrder(formData: FormData) {
  await requireRole(["admin"]);
  const orderId = String(formData.get("order_id") ?? "");
  if (!orderId) redirect(ORDERS);

  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_order", {
    p_order_id: orderId,
  });
  finish(ORDERS, error);
}

export async function markPayoutPaid(formData: FormData) {
  await requireRole(["admin"]);
  const payoutId = String(formData.get("payout_id") ?? "");
  const reference = String(formData.get("reference") ?? "").trim();
  if (!payoutId) redirect(PAYOUTS);

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_mark_payout_paid", {
    p_payout_id: payoutId,
    p_reference: reference,
  });
  if (!error) after(() => notifyPayoutPaid(payoutId));
  finish(PAYOUTS, error);
}

export async function settleDebt(formData: FormData) {
  await requireRole(["admin"]);
  const debtId = String(formData.get("debt_id") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!debtId) redirect(PAYOUTS);

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_settle_debt", {
    p_debt_id: debtId,
    p_note: note,
  });
  finish(PAYOUTS, error);
}

export async function resolveDispute(formData: FormData) {
  await requireRole(["admin"]);
  const disputeId = String(formData.get("dispute_id") ?? "");
  const resolution = String(formData.get("resolution") ?? "");
  const fault = String(formData.get("fault") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const refundRaw = String(formData.get("refund_amount") ?? "").trim();
  if (!disputeId) redirect(DISPUTES);

  const refund = refundRaw === "" ? null : Number(refundRaw);
  if (refund !== null && !Number.isFinite(refund)) {
    fail(DISPUTES, "Enter a valid refund amount.");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_resolve_dispute", {
    p_dispute_id: disputeId,
    p_resolution: resolution,
    p_refund_amount: refund,
    p_fault: fault,
    p_note: note,
  });
  if (!error) after(() => notifyDisputeResolved(disputeId));
  finish(DISPUTES, error);
}

export async function markRefundPaid(formData: FormData) {
  await requireRole(["admin"]);
  const refundId = String(formData.get("refund_id") ?? "");
  const reference = String(formData.get("reference") ?? "").trim();
  if (!refundId) redirect(DISPUTES);

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_mark_refund_paid", {
    p_refund_id: refundId,
    p_reference: reference,
  });
  if (!error) after(() => notifyRefundPaid(refundId));
  finish(DISPUTES, error);
}