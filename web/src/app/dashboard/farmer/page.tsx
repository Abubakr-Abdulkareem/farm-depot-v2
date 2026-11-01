import { Suspense } from "react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/LogoutButton";
import ProductForm from "@/components/ProductForm";
import PickupDetailsForm from "@/components/PickupDetailsForm";
import FarmerOrders from "@/components/FarmerOrders";
import FarmerPayouts from "@/components/FarmerPayouts";
import { deleteProduct } from "./actions";
import type { Product } from "@/types";

async function FarmerContent() {
  const { user, profile } = await requireRole(["farmer"]);

  const supabase = await createClient();
  const [{ data }, { data: details }] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .eq("farmer_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("phone, location, business_name")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const products = (data ?? []) as Product[];
  const hasPickupDetails = Boolean(details?.phone && details?.location);

  return (
    <div className="mt-4 flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <p>Welcome, {profile.full_name}</p>
        <LogoutButton />
      </div>

      {!hasPickupDetails && (
        <p className="rounded border border-yellow-600 p-3 text-yellow-500">
          Add your pickup details below so our driver can collect your orders.
        </p>
      )}

      <PickupDetailsForm
        phone={details?.phone ?? ""}
        location={details?.location ?? ""}
        businessName={details?.business_name ?? ""}
      />

      <ProductForm />

      <section>
        <h2 className="mb-3 text-xl font-semibold">
          Your listings ({products.length})
        </h2>
        {products.length === 0 ? (
          <p className="text-gray-400">You haven&apos;t added any products yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {products.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 rounded border border-gray-700 p-3"
              >
                <div className="flex items-center gap-3">
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className="h-16 w-16 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded bg-gray-800 text-xs text-gray-500">
                      No photo
                    </div>
                  )}
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-sm text-gray-400">
                      ₦{Number(p.price_per_unit).toLocaleString("en-NG")} per {p.unit} ·{" "}
                      {p.quantity_available} {p.unit} available · min order{" "}
                      {p.min_order_quantity}
                    </p>
                  </div>
                </div>
                <form action={deleteProduct}>
                  <input type="hidden" name="id" value={p.id} />
                  <button className="rounded border border-red-500 px-3 py-1 text-red-500">
                    Delete
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Suspense fallback={<p>Loading orders...</p>}>
        <FarmerOrders />
      </Suspense>

      <Suspense fallback={<p>Loading payments...</p>}>
        <FarmerPayouts />
      </Suspense>
    </div>
  );
}

export default function Page() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Farmer dashboard</h1>
      <Suspense fallback={<p>Loading...</p>}>
        <FarmerContent />
      </Suspense>
    </main>
  );
}