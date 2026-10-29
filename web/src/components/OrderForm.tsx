"use client";

import { useActionState, useState } from "react";
import { placeOrder } from "@/app/marketplace/[id]/actions";
import { formatNaira } from "@/lib/format";
import type { FormState } from "@/types";

const initialState: FormState = {};

export default function OrderForm({
  productId,
  unit,
  price,
  min,
  max,
}: {
  productId: string;
  unit: string;
  price: number;
  min: number;
  max: number;
}) {
  const [state, formAction, pending] = useActionState(placeOrder, initialState);
  const [qty, setQty] = useState(String(min));
  const total = Number(qty) > 0 ? Number(qty) * price : 0;

  return (
    <form action={formAction} className="mt-6 flex max-w-sm flex-col gap-3">
      <input type="hidden" name="product_id" value={productId} />
      <label className="text-sm text-gray-400">
        Quantity ({unit}), between {min} and {max}
      </label>
      <input
        name="quantity"
        type="number"
        step="0.01"
        min={min}
        max={max}
        value={qty}
        onChange={(e) => setQty(e.target.value)}
        className="rounded border border-gray-600 bg-transparent p-2"
        required
      />
      <p className="text-lg">
        Estimated total: <span className="font-bold text-green-500">{formatNaira(total)}</span>
      </p>
      {state.error && <p className="text-red-500">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-green-600 p-2 font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Placing order..." : "Place order"}
      </button>
    </form>
  );
}