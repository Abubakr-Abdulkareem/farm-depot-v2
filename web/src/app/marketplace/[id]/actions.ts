"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/types";

export async function placeOrder(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireRole(["buyer"]);

  const productId = String(formData.get("product_id") ?? "");
  const quantity = Number(formData.get("quantity"));
  const deliveryState = String(formData.get("delivery_state") ?? "").trim();
  const address = String(formData.get("delivery_address") ?? "").trim();
  const phone = String(formData.get("delivery_phone") ?? "").trim();

  if (!productId) return { error: "Missing product." };
  if (!Number.isFinite(quantity) || quantity <= 0)
    return { error: "Enter a valid quantity." };
  if (!deliveryState) return { error: "Choose a delivery state." };
  if (address.length < 10) return { error: "Enter a full delivery address." };
  if (!phone) return { error: "Enter a phone number for delivery." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("place_order", {
    p_product_id: productId,
    p_quantity: quantity,
    p_delivery_state: deliveryState,
    p_delivery_address: address,
    p_delivery_phone: phone,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/buyer", "layout");
  redirect("/dashboard/buyer/orders");
}