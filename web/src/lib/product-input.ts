import { containsContactInfo } from "@/lib/contact-filter";
import { isNigerianState } from "@/lib/states";
import { isPerishability, type Perishability } from "@/lib/perishability";

export const CATEGORIES = [
  "Grains",
  "Tubers",
  "Vegetables",
  "Fruits",
  "Livestock",
  "Poultry",
  "Other",
] as const;

export const UNITS = ["kg", "bag", "basket", "crate", "ton"] as const;

export type ProductInput = {
  name: string;
  category: string | null;
  description: string | null;
  unit: string;
  location: string | null;
  origin_state: string;
  perishability: Perishability;
  price_per_unit: number;
  quantity_available: number;
  min_order_quantity: number;
  image_url: string | null;
};

export function parseProductForm(
  formData: FormData,
  userId: string
): { error: string } | { values: ProductInput } {
  const text = (key: string) => String(formData.get(key) ?? "").trim();

  const name = text("name");
  const category = text("category");
  const description = text("description");
  const unit = text("unit") || "kg";
  const location = text("location");
  const originState = text("origin_state");
  const perishability = text("perishability");
  const imageUrl = text("image_url");
  const price = Number(formData.get("price_per_unit"));
  const quantity = Number(formData.get("quantity_available"));
  const minOrder = Number(formData.get("min_order_quantity"));

  if (!name) return { error: "Product name is required." };
  if (name.length > 100) return { error: "The product name is too long." };
  if (description.length > 1000)
    return { error: "The description is too long (maximum 1000 characters)." };
  if (location.length > 100) return { error: "The town or area is too long." };

  if (category && !(CATEGORIES as readonly string[]).includes(category))
    return { error: "Choose a valid category." };
  if (!(UNITS as readonly string[]).includes(unit))
    return { error: "Choose a valid unit." };

  if (!Number.isFinite(price) || price <= 0)
    return { error: "Enter a valid price greater than 0." };
  if (!Number.isFinite(quantity) || quantity <= 0)
    return { error: "Enter a valid quantity available." };
  if (!Number.isFinite(minOrder) || minOrder <= 0)
    return { error: "Enter a valid minimum order." };
  if (minOrder > quantity)
    return { error: "Minimum order can't be more than the quantity available." };

  if (!isNigerianState(originState))
    return { error: "Choose the state where the produce is picked up." };
  if (!isPerishability(perishability))
    return { error: "Choose how fast this produce spoils." };

  if ([name, description, location].some(containsContactInfo)) {
    return {
      error:
        "Please remove phone numbers, emails and links. Buyers and farmers are connected through Farm Depot.",
    };
  }

  // The image must live in THIS farmer's own folder in our storage bucket
  const allowedPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${userId}/`;
  if (imageUrl && !imageUrl.startsWith(allowedPrefix)) {
    return { error: "Invalid image. Please upload the photo again." };
  }

  return {
    values: {
      name,
      category: category || null,
      description: description || null,
      unit,
      location: location || null,
      origin_state: originState,
      perishability,
      price_per_unit: price,
      quantity_available: quantity,
      min_order_quantity: minOrder,
      image_url: imageUrl || null,
    },
  };
}