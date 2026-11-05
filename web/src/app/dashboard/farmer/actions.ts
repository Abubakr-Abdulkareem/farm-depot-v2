"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseProductForm } from "@/lib/product-input";
import { isUuid } from "@/lib/uuid";
import { notifyOrderConfirmed } from "@/lib/notify";
import type { FormState } from "@/types";

async function removeImage(imageUrl: string | null | undefined) {
  if (!imageUrl) return;
  const marker = "/product-images/";
  const idx = imageUrl.indexOf(marker);
  if (idx === -1) return;

  const supabase = await createClient();
  await supabase.storage
    .from("product-images")
    .remove([imageUrl.slice(idx + marker.length)]);
}

function refreshProductPages() {
  revalidatePath("/dashboard/farmer");
  revalidatePath("/marketplace");
}

export async function createProduct(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const { user } = await requireRole(["farmer"]);

  const parsed = parseProductForm(formData, user.id);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();
  const { error } = await supabase.from("products").insert({
    farmer_id: user.id,
    ...parsed.values,
  });

  if (error) return { error: error.message };

  refreshProductPages();
  return { success: true };
}

export async function updateProduct(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const { user } = await requireRole(["farmer"]);

  const productId = String(formData.get("product_id") ?? "");
  if (!isUuid(productId)) return { error: "Missing product." };

  const parsed = parseProductForm(formData, user.id);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("products")
    .select("id, image_url")
    .eq("id", productId)
    .eq("farmer_id", user.id)
    .maybeSingle();

  if (!existing) return { error: "Product not found." };

  const { error } = await supabase
    .from("products")
    .update(parsed.values)
    .eq("id", productId)
    .eq("farmer_id", user.id);

  if (error) return { error: error.message };

  if (existing.image_url && existing.image_url !== parsed.values.image_url) {
    await removeImage(existing.image_url);
  }

  refreshProductPages();
  revalidatePath(`/marketplace/${productId}`);
  redirect("/dashboard/farmer?notice=updated");
}

export async function setProductActive(formData: FormData) {
  const { user } = await requireRole(["farmer"]);

  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  if (!isUuid(id)) redirect("/dashboard/farmer");

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({ is_active: active })
    .eq("id", id)
    .eq("farmer_id", user.id);

  refreshProductPages();
  revalidatePath(`/marketplace/${id}`);

  if (error) redirect("/dashboard/farmer?notice=update_failed");
  redirect(`/dashboard/farmer?notice=${active ? "shown" : "hidden"}`);
}

export async function deleteProduct(formData: FormData) {
  const { user } = await requireRole(["farmer"]);

  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) redirect("/dashboard/farmer");

  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select("image_url")
    .eq("id", id)
    .eq("farmer_id", user.id)
    .maybeSingle();

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id)
    .eq("farmer_id", user.id);

  if (error) {
    // 23503 = the product is referenced by existing orders
    redirect(
      `/dashboard/farmer?notice=${
        error.code === "23503" ? "has_orders" : "delete_failed"
      }`
    );
  }

  await removeImage(product?.image_url);

  refreshProductPages();
  redirect("/dashboard/farmer?notice=deleted");
}

export async function updateOrderStatus(formData: FormData) {
  await requireRole(["farmer"]);

  const orderId = String(formData.get("order_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!orderId || status !== "confirmed") return;

  const supabase = await createClient();
  const { error } = await supabase.rpc("farmer_update_order_status", {
    p_order_id: orderId,
    p_new_status: status,
  });

  if (error) {
    console.error("Order status update failed:", error.message);
  } else {
    after(() => notifyOrderConfirmed(orderId));
  }

  revalidatePath("/dashboard/farmer");
  revalidatePath("/dashboard/buyer");
  revalidatePath("/admin");
}

export async function saveProfileDetails(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const { user } = await requireRole(["farmer"]);

  const phone = String(formData.get("phone") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const businessName = String(formData.get("business_name") ?? "").trim();

  if (!/^\+?[0-9][0-9 ]{7,16}$/.test(phone))
    return { error: "Enter a valid phone number." };
  if (location.length < 10 || location.length > 300)
    return { error: "Enter your full pickup address (at least 10 characters)." };
  if (businessName.length > 100)
    return { error: "Business name is too long." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      phone,
      location,
      business_name: businessName || null,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/farmer");
  revalidatePath("/admin");
  return { success: true };
}