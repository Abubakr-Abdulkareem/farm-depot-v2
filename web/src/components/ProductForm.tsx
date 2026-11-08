"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { createProduct, updateProduct } from "@/app/dashboard/farmer/actions";
import { createClient } from "@/lib/supabase/client";
import { NIGERIAN_STATES } from "@/lib/states";
import { CATEGORIES, UNITS } from "@/lib/product-input";
import {
  card,
  field,
  ghostButton,
  noticeBad,
  primaryButton,
  smallButton,
} from "@/lib/layout";
import type { FormState, Product } from "@/types";

const initialState: FormState = {};
const input = `${field} w-full`;

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function ProductForm({ product }: { product?: Product }) {
  const editing = Boolean(product);

  const [imageUrl, setImageUrl] = useState(product?.image_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const [state, formAction, pending] = useActionState(
    async (prev: FormState, formData: FormData) =>
      product
        ? updateProduct(prev, formData)
        : createProduct(prev, formData),
    initialState
  );

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setImageError(null);
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setImageError("Use a JPG, PNG or WebP image.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_BYTES) {
      setImageError("Image is too large. Maximum size is 5 MB.");
      e.target.value = "";
      return;
    }

    setUploading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setImageError("Please log in again.");
      setUploading(false);
      return;
    }

    const ext =
      file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
        ? "webp"
        : "jpg";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
      .from("product-images")
      .upload(path, file, {
        contentType: file.type,
        cacheControl: "31536000",
      });

    if (error) {
      setImageError(error.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    setImageUrl(data.publicUrl);
    setUploading(false);
  }

  return (
    <form action={formAction} className={`${card} flex flex-col gap-3`}>
      <h2 className="text-xl font-semibold">
        {editing ? "Edit product" : "Add a product"}
      </h2>

      {product && <input type="hidden" name="product_id" value={product.id} />}

      <input
        name="name"
        defaultValue={product?.name ?? ""}
        placeholder="Product name (e.g. White maize)"
        className={input}
        required
      />

      <select
        name="category"
        className={input}
        defaultValue={product?.category ?? ""}
      >
        <option value="" className="text-black">
          Category (optional)
        </option>
        {CATEGORIES.map((c) => (
          <option key={c} value={c} className="text-black">
            {c}
          </option>
        ))}
      </select>

      <select
        name="perishability"
        className={input}
        defaultValue={product?.perishability ?? ""}
        required
      >
        <option value="" className="text-black">
          How fast does it spoil?
        </option>
        <option value="low" className="text-black">
          Long-lasting (yam, dry grains, beans)
        </option>
        <option value="medium" className="text-black">
          Lasts a day or two (onions, peppers, most fruits)
        </option>
        <option value="high" className="text-black">
          Spoils fast (tomatoes, leafy vegetables, fresh fish, eggs)
        </option>
      </select>
      <p className="-mt-2 text-xs text-white/50">
        Fast-spoiling produce can only be delivered on short routes.
      </p>

      <textarea
        name="description"
        defaultValue={product?.description ?? ""}
        placeholder="Description (quality, harvest date, etc.)"
        className={input}
        rows={3}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="price_per_unit"
          type="number"
          step="0.01"
          min="0"
          defaultValue={product?.price_per_unit ?? ""}
          placeholder="Price per unit (₦)"
          className={input}
          required
        />
        <select
          name="unit"
          className={input}
          defaultValue={product?.unit ?? "kg"}
        >
          {UNITS.map((u) => (
            <option key={u} value={u} className="text-black">
              per {u}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="quantity_available"
          type="number"
          step="0.01"
          min="0"
          defaultValue={product?.quantity_available ?? ""}
          placeholder="Quantity available"
          className={input}
          required
        />
        <input
          name="min_order_quantity"
          type="number"
          step="0.01"
          min="0"
          defaultValue={product?.min_order_quantity ?? ""}
          placeholder="Minimum order"
          className={input}
          required
        />
      </div>

      <select
        name="origin_state"
        className={input}
        defaultValue={product?.origin_state ?? ""}
        required
      >
        <option value="" className="text-black">
          State where the produce is picked up
        </option>
        {NIGERIAN_STATES.map((s) => (
          <option key={s} value={s} className="text-black">
            {s}
          </option>
        ))}
      </select>

      <input
        name="location"
        defaultValue={product?.location ?? ""}
        placeholder="Town or area (optional, no phone numbers)"
        className={input}
      />

      <div className="flex flex-col gap-2">
        <label className="text-sm text-white/60">
          Product photo (optional, JPG/PNG/WebP, max 5 MB)
        </label>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFile}
          className="text-sm text-white/70 file:mr-3 file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:py-1.5 file:text-sm file:text-white"
        />
        {uploading && <p className="text-sm text-white/60">Uploading photo...</p>}
        {imageError && <p className="text-sm text-red-300">{imageError}</p>}
        {imageUrl && (
          <div className="flex items-end gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Product preview"
              className="h-40 w-40 rounded-xl object-cover"
            />
            <button
              type="button"
              onClick={() => setImageUrl("")}
              className={smallButton}
            >
              Remove photo
            </button>
          </div>
        )}
        <input type="hidden" name="image_url" value={imageUrl} />
      </div>

      {state.error && <p className={noticeBad}>{state.error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || uploading}
          className={primaryButton}
        >
          {pending
            ? "Saving..."
            : uploading
            ? "Uploading photo..."
            : editing
            ? "Save changes"
            : "Add product"}
        </button>
        <Link href="/dashboard/farmer/listings" className={ghostButton}>
          Cancel
        </Link>
      </div>
    </form>
  );
}