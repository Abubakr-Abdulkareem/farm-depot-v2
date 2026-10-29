"use client";

import { useActionState, useEffect, useRef } from "react";
import { createProduct } from "@/app/dashboard/farmer/actions";
import type { FormState } from "@/types";

const initialState: FormState = {};
const input = "rounded border border-gray-600 bg-transparent p-2 w-full";

export default function ProductForm() {
  const [state, formAction, pending] = useActionState(
    createProduct,
    initialState
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

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

      <input name="location" placeholder="Location (e.g. Ogun State)" className={input} />

      {state.error && <p className="text-red-500">{state.error}</p>}
      {state.success && <p className="text-green-500">Product added.</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-green-600 p-2 font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Saving..." : "Add product"}
      </button>
    </form>
  );
}