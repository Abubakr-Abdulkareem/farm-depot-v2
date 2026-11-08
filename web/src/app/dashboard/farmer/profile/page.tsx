import { Suspense } from "react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import PickupDetailsForm from "@/components/PickupDetailsForm";
import { eyebrow, pageTitle } from "@/lib/layout";

async function ProfileContent() {
  const { user } = await requireRole(["farmer"]);
  const supabase = await createClient();
  const { data: details } = await supabase
    .from("profiles")
    .select("phone, location, business_name")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="max-w-2xl">
      <PickupDetailsForm
        phone={details?.phone ?? ""}
        location={details?.location ?? ""}
        businessName={details?.business_name ?? ""}
      />
    </div>
  );
}

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className={eyebrow}>Pickup details</p>
        <h1 className={`mt-2 ${pageTitle}`}>Where we collect your produce</h1>
      </div>
      <Suspense fallback={<p className="text-white/60">Loading...</p>}>
        <ProfileContent />
      </Suspense>
    </div>
  );
}