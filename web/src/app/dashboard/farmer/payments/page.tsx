import { Suspense } from "react";
import { requireRole } from "@/lib/auth";
import FarmerPayouts from "@/components/FarmerPayouts";
import { eyebrow, pageTitle } from "@/lib/layout";

async function PaymentsContent() {
  await requireRole(["farmer"]);
  return <FarmerPayouts />;
}

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className={eyebrow}>Payments</p>
        <h1 className={`mt-2 ${pageTitle}`}>Your payments</h1>
      </div>
      <Suspense fallback={<p className="text-white/60">Loading...</p>}>
        <PaymentsContent />
      </Suspense>
    </div>
  );
}