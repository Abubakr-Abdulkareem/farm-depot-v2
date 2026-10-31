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
  const imageUrl = String(formData.get("image_url") ?? "").trim();
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

  // The image must live in THIS farmer's own folder in our storage bucket
  const allowedPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${user.id}/`;
  if (imageUrl && !imageUrl.startsWith(allowedPrefix)) {
    return { error: "Invalid image. Please upload the photo again." };
  }

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
    image_url: imageUrl || null,
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

  const { data: product } = await supabase
    .from("products")
    .select("image_url")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("products").delete().eq("id", id);

  if (!error && product?.image_url) {
    const marker = "/product-images/";
    const idx = product.image_url.indexOf(marker);
    if (idx !== -1) {
      await supabase.storage
        .from("product-images")
        .remove([product.image_url.slice(idx + marker.length)]);
    }
  }

  revalidatePath("/dashboard/farmer");
  revalidatePath("/marketplace");
}

export async function updateOrderStatus(formData: FormData) {
  await requireRole(["farmer"]);

  const orderId = String(formData.get("order_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!orderId || !["confirmed", "delivered"].includes(status)) return;

  const supabase = await createClient();
  const { error } = await supabase.rpc("farmer_update_order_status", {
    p_order_id: orderId,
    p_new_status: status,
  });
  if (error) console.error("Order status update failed:", error.message);

  revalidatePath("/dashboard/farmer");
  revalidatePath("/dashboard/buyer");
}