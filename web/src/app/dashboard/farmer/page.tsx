import { Suspense } from "react";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/LogoutButton";
import ProductForm from "@/components/ProductForm";
import PickupDetailsForm from "@/components/PickupDetailsForm";
import FarmerOrders from "@/components/FarmerOrders";
import FarmerPayouts from "@/components/FarmerPayouts";
import { deleteProduct, setProductActive } from "./actions";
import type { Product } from "@/types";

type Params = { notice?: string };

const NOTICES: Record<string, { text: string; good: boolean }> = {
  updated: { text: "Listing updated.", good: true },
  hidden: {
    text: "Listing hidden. Buyers can't see it until you show it again.",
    good: true,
  },
  shown: { text: "Listing is visible again.", good: true },
  deleted: { text: "Listing deleted.", good: true },
  has_orders: {
    text: "This listing has orders, so it can't be deleted. Hide it instead.",
    good: false,
  },
  delete_failed: {
    text: "We couldn't delete that listing. Please try again.",
    good: false,
  },
  update_failed: {
    text: "We couldn't update that listing. Please try again.",
    good: false,
  },
};

async function FarmerContent({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const { user, profile } = await requireRole(["farmer"]);
  const { notice } = await searchParams;
  const message = notice ? NOTICES[notice] : undefined;

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

      {message && (
        <p
          className={`rounded border p-3 ${
            message.good
              ? "border-green-600 text-green-500"
              : "border-red-600 text-red-500"
          }`}
        >
          {message.text}
        </p>
      )}

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
                className="flex flex-wrap items-center justify-between gap-3 rounded border border-gray-700 p-3"
              >
                <div className="flex items-center gap-3">
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className={`h-16 w-16 rounded object-cover ${
                        p.is_active ? "" : "opacity-50"
                      }`}
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded bg-gray-800 text-xs text-gray-500">
                      No photo
                    </div>
                  )}
                  <div>
                    <p className="flex flex-wrap items-center gap-2 font-semibold">
                      {p.name}
                      {!p.is_active && (
                        <span className="rounded bg-gray-700 px-2 py-0.5 text-xs uppercase text-gray-200">
                          Hidden
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-400">
                      ₦{Number(p.price_per_unit).toLocaleString("en-NG")} per {p.unit} ·{" "}
                      {p.quantity_available} {p.unit} available · min order{" "}
                      {p.min_order_quantity}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/dashboard/farmer/products/${p.id}/edit`}
                    className="rounded border border-gray-600 px-3 py-1 text-sm"
                  >
                    Edit
                  </Link>

                  <form action={setProductActive}>
                    <input type="hidden" name="id" value={p.id} />
                    <input
                      type="hidden"
                      name="active"
                      value={p.is_active ? "false" : "true"}
                    />
                    <button className="rounded border border-gray-600 px-3 py-1 text-sm">
                      {p.is_active ? "Hide" : "Show"}
                    </button>
                  </form>

                  <form action={deleteProduct}>
                    <input type="hidden" name="id" value={p.id} />
                    <button className="rounded border border-red-500 px-3 py-1 text-sm text-red-500">
                      Delete
                    </button>
                  </form>
                </div>
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

export default function Page({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Farmer dashboard</h1>
      <Suspense fallback={<p>Loading...</p>}>
        <FarmerContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}