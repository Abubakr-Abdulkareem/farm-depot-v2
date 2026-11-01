"use client";

import { useActionState } from "react";
import { saveProfileDetails } from "@/app/dashboard/farmer/actions";
import type { FormState } from "@/types";

const initialState: FormState = {};
const input = "rounded border border-gray-600 bg-transparent p-2 w-full";

export default function PickupDetailsForm({
  phone,
  location,
  businessName,
}: {
  phone: string;
  location: string;
  businessName: string;
}) {
  const [state, formAction, pending] = useActionState(
    saveProfileDetails,
    initialState
  );

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-3">
      <h2 className="text-xl font-semibold">Your pickup details</h2>
      <p className="text-sm text-gray-400">
        Private. Only Farm Depot staff and our driver see this, never buyers.
      </p>

      <input
        name="business_name"
        defaultValue={businessName}
        placeholder="Farm or business name (optional)"
        className={input}
      />
      <input
        name="phone"
        type="tel"
        defaultValue={phone}
        placeholder="Phone number for pickup"
        className={input}
        required
      />
      <textarea
        name="location"
        defaultValue={location}
        rows={3}
        placeholder="Full pickup address and landmarks"
        className={input}
        required
      />

      {state.error && <p className="text-red-500">{state.error}</p>}
      {state.success && <p className="text-green-500">Saved.</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-green-600 p-2 font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Saving..." : "Save pickup details"}
      </button>
    </form>
  );
}