"use client";

import { useActionState, useState } from "react";
import { placeOrder } from "@/app/marketplace/[id]/actions";
import { formatNaira } from "@/lib/format";
import type { DeliveryRoute, FormState } from "@/types";

const initialState: FormState = {};
const field = "rounded border border-gray-600 bg-transparent p-2 w-full";

export default function OrderForm({
  productId,
  unit,
  price,
  min,
  max,
  routes,
}: {
  productId: string;
  unit: string;
  price: number;
  min: number;
  max: number;
  routes: DeliveryRoute[];
}) {
  const [state, formAction, pending] = useActionState(placeOrder, initialState);
  const [qty, setQty] = useState(String(min));
  const [deliveryState, setDeliveryState] = useState("");

  const itemsTotal = Number(qty) > 0 ? Number(qty) * price : 0;
  const selected = routes.find((r) => r.state === deliveryState);
  const fee = selected?.fee ?? 0;
  const total = itemsTotal + (selected ? fee : 0);

  if (routes.length === 0) {
    return (
      <p className="mt-6 text-gray-400">
        Delivery from this seller&apos;s state isn&apos;t available yet. Please
        check back soon.
      </p>
    );
  }

  if (!routes.some((r) => r.allowed)) {
    return (
      <p className="mt-6 text-gray-400">
        This produce spoils quickly, and none of our delivery routes from the
        pickup point are short enough yet. Please check back soon.
      </p>
    );
  }

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
        className={field}
        required
      />

      <label className="text-sm text-gray-400">Delivery state</label>
      <select
        name="delivery_state"
        value={deliveryState}
        onChange={(e) => setDeliveryState(e.target.value)}
        className={field}
        required
      >
        <option value="" className="text-black">
          Choose a state
        </option>
        {routes.map((r) => (
          <option
            key={r.state}
            value={r.state}
            disabled={!r.allowed}
            className="text-black"
          >
            {r.state}{" "}
            {r.allowed
              ? `(about ${r.transitHours}h)`
              : "(too far for this produce)"}
          </option>
        ))}
      </select>

      <label className="text-sm text-gray-400">Delivery address</label>
      <textarea
        name="delivery_address"
        rows={3}
        placeholder="Street, area, landmark"
        className={field}
        required
      />

      <label className="text-sm text-gray-400">Phone number for delivery</label>
      <input
        name="delivery_phone"
        type="tel"
        placeholder="e.g. 0801 234 5678"
        className={field}
        required
      />

      <div className="rounded border border-gray-700 p-3 text-sm">
        <p className="flex justify-between">
          <span>Produce</span>
          <span>{formatNaira(itemsTotal)}</span>
        </p>
        <p className="flex justify-between">
          <span>Delivery</span>
          <span>{selected ? formatNaira(fee) : "Choose a state"}</span>
        </p>
        <p className="mt-1 flex justify-between border-t border-gray-700 pt-1 text-base font-bold text-green-500">
          <span>Total</span>
          <span>{formatNaira(total)}</span>
        </p>
      </div>

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