import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { formatNaira } from "@/lib/format";
import { PERISHABILITY } from "@/lib/perishability";
import { container, eyebrow } from "@/lib/layout";
import OrderForm from "@/components/OrderForm";
import type { Product, DeliveryRoute } from "@/types";

async function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) notFound();
  const p = data as Product;

  const current = await getCurrentUser();

  let routes: DeliveryRoute[] = [];
  if (current?.role === "buyer" && p.origin_state) {
    const [{ data: zones }, { data: rule }] = await Promise.all([
      supabase
        .from("delivery_zones")
        .select("destination_state, fee, transit_hours")
        .eq("origin_state", p.origin_state)
        .order("destination_state"),
      supabase
        .from("perishability_rules")
        .select("max_transit_hours")
        .eq("level", p.perishability)
        .maybeSingle(),
    ]);

    const maxHours = rule ? Number(rule.max_transit_hours) : null;

    routes = (zones ?? []).map((z) => ({
      state: z.destination_state as string,
      fee: Number(z.fee),
      transitHours: Number(z.transit_hours),
      allowed: maxHours === null || Number(z.transit_hours) <= maxHours,
    }));
  }

  const place = [p.location, p.origin_state].filter(Boolean).join(", ");
  const level = PERISHABILITY[p.perishability] ?? PERISHABILITY.medium;

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="aspect-4/3 w-full overflow-hidden rounded-3xl border border-white/10 bg-white/5">
        {p.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.image_url}
            alt={p.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-white/40">
            No photo
          </div>
        )}
      </div>

      <div>
        <p className={eyebrow}>{p.category ?? "Produce"}</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{p.name}</h1>

        <p className="mt-4 text-3xl font-bold text-lime-300">
          {formatNaira(p.price_per_unit)}
          <span className="text-base font-normal text-white/60">
            {" "}
            / {p.unit}
          </span>
        </p>

        <ul className="mt-4 space-y-1 text-sm text-white/80">
          <li>
            {p.quantity_available} {p.unit} available
          </li>
          <li>
            Minimum order: {p.min_order_quantity} {p.unit}
          </li>
          {place && <li>📍 {place}</li>}
          <li className="text-white/50">
            Seller: Farmer #{p.farmer_id.slice(0, 4).toUpperCase()}
          </li>
        </ul>

        <div
          className={`mt-5 rounded-2xl border p-4 text-sm ${
            p.perishability === "high"
              ? "border-red-800 bg-red-950/40 text-red-200"
              : "border-white/10 bg-white/5 text-white/80"
          }`}
        >
          <p className="font-semibold">{level.label}</p>
          <p>{level.note}</p>
        </div>

        {p.description && (
          <p className="mt-5 text-white/80">{p.description}</p>
        )}

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
          {!current ? (
            <p>
              <Link href="/login" className="text-lime-300 underline">
                Log in
              </Link>{" "}
              or{" "}
              <Link href="/register" className="text-lime-300 underline">
                create a buyer account
              </Link>{" "}
              to order.
            </p>
          ) : current.role === "buyer" ? (
            <OrderForm
              productId={p.id}
              unit={p.unit}
              price={Number(p.price_per_unit)}
              min={Number(p.min_order_quantity)}
              max={Number(p.quantity_available)}
              routes={routes}
            />
          ) : (
            <p className="text-white/60">
              Only buyer accounts can place orders.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className={`${container} py-8`}>
      <Link
        href="/marketplace"
        className="mb-6 inline-block text-sm text-white/60 transition hover:text-white"
      >
        ← Back to marketplace
      </Link>
      <Suspense fallback={<p className="text-white/60">Loading...</p>}>
        <ProductDetail params={params} />
      </Suspense>
    </main>
  );
}