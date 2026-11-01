"use client";

import { useActionState, useRef, useState } from "react";
import { createProduct } from "@/app/dashboard/farmer/actions";
import { createClient } from "@/lib/supabase/client";
import { NIGERIAN_STATES } from "@/lib/states";
import type { FormState } from "@/types";

const initialState: FormState = {};
const input = "rounded border border-gray-600 bg-transparent p-2 w-full";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function ProductForm() {
    const formRef = useRef<HTMLFormElement>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const [state, formAction, pending] = useActionState(
    async (prev: FormState, formData: FormData) => {
      const result = await createProduct(prev, formData);
      if (result.success) setImageUrl("");
      return result;
    },
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
    <form
      ref={formRef}
      action={formAction}
      className="flex max-w-xl flex-col gap-3"
    >
      <h2 className="text-xl font-semibold">Add a product</h2>

      <input name="name" placeholder="Product name (e.g. White maize)" className={input} required />

      <select name="category" className={input} defaultValue="">
        <option value="" className="text-black">Category (optional)</option>
        <option value="Grains" className="text-black">Grains</option>
        <option value="Tubers" className="text-black">Tubers</option>
        <option value="Vegetables" className="text-black">Vegetables</option>
        <option value="Fruits" className="text-black">Fruits</option>
        <option value="Livestock" className="text-black">Livestock</option>
        <option value="Poultry" className="text-black">Poultry</option>
        <option value="Other" className="text-black">Other</option>
      </select>

      <textarea name="description" placeholder="Description (quality, harvest date, etc.)" className={input} rows={3} />

      <div className="flex gap-3">
        <input name="price_per_unit" type="number" step="0.01" min="0" placeholder="Price per unit (₦)" className={input} required />
        <select name="unit" className={input} defaultValue="kg">
          <option value="kg" className="text-black">per kg</option>
          <option value="bag" className="text-black">per bag</option>
          <option value="basket" className="text-black">per basket</option>
          <option value="crate" className="text-black">per crate</option>
          <option value="ton" className="text-black">per ton</option>
        </select>
      </div>

      <div className="flex gap-3">
        <input name="quantity_available" type="number" step="0.01" min="0" placeholder="Quantity available" className={input} required />
        <input name="min_order_quantity" type="number" step="0.01" min="0" placeholder="Minimum order" className={input} required />
      </div>

      <select name="origin_state" className={input} defaultValue="" required>
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
        placeholder="Town or area (optional, no phone numbers)"
        className={input}
      />

      <div className="flex flex-col gap-2">
        <label className="text-sm text-gray-400">
          Product photo (optional, JPG/PNG/WebP, max 5 MB)
        </label>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFile}
          className="text-sm"
        />
        {uploading && <p className="text-sm text-gray-400">Uploading photo...</p>}
        {imageError && <p className="text-sm text-red-500">{imageError}</p>}
        {imageUrl && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Product preview"
              className="h-40 w-40 rounded object-cover"
            />
          </>
        )}
        <input type="hidden" name="image_url" value={imageUrl} />
      </div>

      {state.error && <p className="text-red-500">{state.error}</p>}
      {state.success && <p className="text-green-500">Product added.</p>}

      <button
        type="submit"
        disabled={pending || uploading}
        className="rounded bg-green-600 p-2 font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Saving..." : uploading ? "Uploading photo..." : "Add product"}
      </button>
    </form>
  );
}