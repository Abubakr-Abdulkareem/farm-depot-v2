"use client";

import { useActionState } from "react";
import { saveProfileDetails } from "@/app/dashboard/farmer/actions";
import {
  card,
  field,
  noticeBad,
  noticeGood,
  primaryButton,
} from "@/lib/layout";
import type { FormState } from "@/types";

const initialState: FormState = {};
const input = `${field} w-full`;

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
    <form action={formAction} className={`${card} flex flex-col gap-3`}>
      <h2 className="text-xl font-semibold">Your pickup details</h2>
      <p className="text-sm text-white/60">
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

      {state.error && <p className={noticeBad}>{state.error}</p>}
      {state.success && <p className={noticeGood}>Saved.</p>}

      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? "Saving..." : "Save pickup details"}
      </button>
    </form>
  );
}