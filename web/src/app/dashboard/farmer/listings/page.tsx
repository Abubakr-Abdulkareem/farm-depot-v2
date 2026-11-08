import { Suspense } from "react";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  badge,
  card,
  dangerButton,
  eyebrow,
  noticeBad,
  noticeGood,
  pageTitle,
  primaryButton,
  smallButton,
} from "@/lib/layout";
import { deleteProduct, setProductActive } from "../actions";
import type { Product } from "@/types";

type Params = { notice?: string };

const NOTICES: Record<string, { text: string; good: boolean }> = {
  created: { text: "Listing added.", good: true },
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

async function ListingsContent({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const { user } = await requireRole(["farmer"]);
  const { notice } = await searchParams;
  const message = notice ? NOTICES[notice] : undefined;

  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("farmer_id", user.id)
    .order("created_at", { ascending: false });

  const products = (data ?? []) as Product[];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={eyebrow}>Listings</p>
          <h1 className={`mt-2 ${pageTitle}`}>
            Your listings ({products.length})
          </h1>
        </div>
        <Link
          href="/dashboard/farmer/listings/new"
          className={`${primaryButton} py-2 text-sm`}
        >
          + Add a listing
        </Link>
      </div>

      {message && (
        <p className={message.good ? noticeGood : noticeBad}>{message.text}</p>
      )}

      {products.length === 0 ? (
        <p className="text-white/60">You haven&apos;t added any products yet.</p>
      ) : (
        <ul className="grid gap-3 xl:grid-cols-2">
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
                    {p.unit} · {p.quantity_available} {p.unit} available · min
                    order {p.min_order_quantity}
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
    </div>
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  return (
    <Suspense fallback={<p className="text-white/60">Loading...</p>}>
      <ListingsContent searchParams={searchParams} />
    </Suspense>
  );
}