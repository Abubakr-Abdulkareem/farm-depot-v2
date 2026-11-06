import { Suspense } from "react";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/LogoutButton";
import ProductForm from "@/components/ProductForm";
import PickupDetailsForm from "@/components/PickupDetailsForm";
import FarmerOrders from "@/components/FarmerOrders";
import FarmerPayouts from "@/components/FarmerPayouts";
import {
  badge,
  card,
  container,
  dangerButton,
  eyebrow,
  noticeBad,
  noticeGood,
  noticeWarn,
  smallButton,
} from "@/lib/layout";
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
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={eyebrow}>Farmer dashboard</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
            Welcome, {profile.full_name}
          </h1>
        </div>
        <LogoutButton />
      </div>

      {message && (
        <p className={message.good ? noticeGood : noticeBad}>{message.text}</p>
      )}

      {!hasPickupDetails && (
        <p className={noticeWarn}>
          Add your pickup details below so our driver can collect your orders.
        </p>
      )}

      <div className="grid items-start gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-8">
          <PickupDetailsForm
            phone={details?.phone ?? ""}
            location={details?.location ?? ""}
            businessName={details?.business_name ?? ""}
          />
          <ProductForm />
        </div>

        <div className="flex flex-col gap-8">
          <section>
            <h2 className="mb-3 text-xl font-semibold">
              Your listings ({products.length})
            </h2>
            {products.length === 0 ? (
              <p className="text-white/60">
                You haven&apos;t added any products yet.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {products.map((p) => (
                  <li
                    key={p.id}
                    className={`${card} flex flex-wrap items-center justify-between gap-3`}
                  >
                    <div className="flex items-center gap-3">
                      {p.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.image_url}
                          alt={p.name}
                          className={`h-16 w-16 rounded-xl object-cover ${
                            p.is_active ? "" : "opacity-50"
                          }`}
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/10 text-xs text-white/40">
                          No photo
                        </div>
                      )}
                      <div>
                        <p className="flex flex-wrap items-center gap-2 font-semibold">
                          {p.name}
                          {!p.is_active && (
                            <span className={`${badge} bg-white/15 text-white/80`}>
                              Hidden
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-white/60">
                          ₦{Number(p.price_per_unit).toLocaleString("en-NG")} per{" "}
                          {p.unit} · {p.quantity_available} {p.unit} available ·
                          min order {p.min_order_quantity}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/dashboard/farmer/products/${p.id}/edit`}
                        className={smallButton}
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
                        <button className={smallButton}>
                          {p.is_active ? "Hide" : "Show"}
                        </button>
                      </form>

                      <form action={deleteProduct}>
                        <input type="hidden" name="id" value={p.id} />
                        <button className={dangerButton}>Delete</button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <Suspense fallback={<p className="text-white/60">Loading orders...</p>}>
            <FarmerOrders />
          </Suspense>

          <Suspense
            fallback={<p className="text-white/60">Loading payments...</p>}
          >
            <FarmerPayouts />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  return (
    <main className={`${container} py-8`}>
      <Suspense fallback={<p className="text-white/60">Loading...</p>}>
        <FarmerContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}