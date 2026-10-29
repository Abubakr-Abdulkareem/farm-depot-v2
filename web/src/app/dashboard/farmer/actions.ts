"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/types";

export async function createProduct(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const { user } = await requireRole(["farmer"]);

  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const unit = String(formData.get("unit") ?? "kg").trim();
  const location = String(formData.get("location") ?? "").trim();
  const price = Number(formData.get("price_per_unit"));
  const quantity = Number(formData.get("quantity_available"));
  const minOrder = Number(formData.get("min_order_quantity"));

  if (!name) return { error: "Product name is required." };
  if (!Number.isFinite(price) || price <= 0)
    return { error: "Enter a valid price greater than 0." };
  if (!Number.isFinite(quantity) || quantity <= 0)
    return { error: "Enter a valid quantity available." };
  if (!Number.isFinite(minOrder) || minOrder <= 0)
    return { error: "Enter a valid minimum order." };
  if (minOrder > quantity)
    return { error: "Minimum order can't be more than the quantity available." };

  const supabase = await createClient();
  const { error } = await supabase.from("products").insert({
    farmer_id: user.id,
    name,
    category: category || null,
    description: description || null,
    price_per_unit: price,
    unit,
    quantity_available: quantity,
    min_order_quantity: minOrder,
    location: location || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/farmer");
  revalidatePath("/marketplace");
  return { success: true };
}

export async function deleteProduct(formData: FormData) {
  await requireRole(["farmer"]);

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("products").delete().eq("id", id);

  revalidatePath("/dashboard/farmer");
  revalidatePath("/marketplace");
}