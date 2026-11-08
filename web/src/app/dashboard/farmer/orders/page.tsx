import { Suspense } from "react";
import { requireRole } from "@/lib/auth";
import FarmerOrders from "@/components/FarmerOrders";
import { eyebrow, pageTitle } from "@/lib/layout";

async function OrdersContent() {
  await requireRole(["farmer"]);
  return <FarmerOrders />;
}

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className={eyebrow}>Orders</p>
        <h1 className={`mt-2 ${pageTitle}`}>Orders for your produce</h1>
      </div>
      <Suspense fallback={<p className="text-white/60">Loading...</p>}>
        <OrdersContent />
      </Suspense>
    </div>
  );
}