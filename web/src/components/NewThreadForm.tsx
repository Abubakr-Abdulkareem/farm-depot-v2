"use client";

import { useActionState } from "react";
import { startThread } from "@/app/support/actions";
import type { FormState } from "@/types";

const initialState: FormState = {};
const field = "w-full rounded border border-gray-600 bg-transparent p-2 text-sm";

export type OrderOption = { id: string; label: string };

export default function NewThreadForm({ orders }: { orders: OrderOption[] }) {
  const [state, formAction, pending] = useActionState(
    startThread,
    initialState
  );

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-3">
      <h2 className="text-xl font-semibold">Start a conversation</h2>
      <p className="text-sm text-gray-400">
        You are talking to Farm Depot. Farm Depot staff can read this
        conversation.
      </p>

      <input
        name="subject"
        placeholder="Subject (e.g. Question about my order)"
        minLength={3}
        maxLength={120}
        className={field}
        required
      />

      <select name="order_id" defaultValue="" className={field}>
        <option value="" className="text-black">
          Not about a specific order
        </option>
        {orders.map((o) => (
          <option key={o.id} value={o.id} className="text-black">
            {o.label}
          </option>
        ))}
      </select>

      <textarea
        name="body"
        rows={4}
        maxLength={2000}
        placeholder="How can we help?"
        className={field}
        required
      />

      {state.error && <p className="text-sm text-red-500">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded bg-green-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Sending..." : "Send"}
      </button>
    </form>
  );
}