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

  if (!productId) return { error: "Missing product." };
  if (!Number.isFinite(quantity) || quantity <= 0)
    return { error: "Enter a valid quantity." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("place_order", {
    p_product_id: productId,
    p_quantity: quantity,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/buyer");
  redirect("/dashboard/buyer");
}