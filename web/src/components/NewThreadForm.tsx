"use client";

import { useActionState } from "react";
import { startThread } from "@/app/support/actions";
import { card, field, noticeBad, primaryButton } from "@/lib/layout";
import type { FormState } from "@/types";

const initialState: FormState = {};
const input = `${field} w-full`;

export type OrderOption = { id: string; label: string };

export default function NewThreadForm({ orders }: { orders: OrderOption[] }) {
  const [state, formAction, pending] = useActionState(
    startThread,
    initialState
  );

  return (
    <form action={formAction} className={`${card} flex flex-col gap-3`}>
      <h2 className="text-xl font-semibold">Start a conversation</h2>
      <p className="text-sm text-white/60">
        You are talking to Farm Depot. Farm Depot staff can read this
        conversation.
      </p>

      <input
        name="subject"
        placeholder="Subject (e.g. Question about my order)"
        minLength={3}
        maxLength={120}
        className={input}
        required
      />

      <select name="order_id" defaultValue="" className={input}>
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
        className={input}
        required
      />

      {state.error && <p className={noticeBad}>{state.error}</p>}

      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? "Sending..." : "Send"}
      </button>
    </form>
  );
}