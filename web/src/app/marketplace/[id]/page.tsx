import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { formatNaira } from "@/lib/format";
import OrderForm from "@/components/OrderForm";
import type { Product, FarmerPublic } from "@/types";

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

  const { data: farmer } = await supabase
    .from("farmer_public")
    .select("*")
    .eq("id", p.farmer_id)
    .maybeSingle();
  const farmerInfo = farmer as FarmerPublic | null;

  const current = await getCurrentUser();

  return (
    <div className="max-w-xl">
      <h1 className="text-3xl font-bold">{p.name}</h1>
      {p.category && <p className="text-gray-400">{p.category}</p>}

      <p className="mt-4 text-2xl font-bold text-green-500">
        {formatNaira(p.price_per_unit)}
        <span className="text-base font-normal text-gray-400"> / {p.unit}</span>
      </p>

      <ul className="mt-3 space-y-1 text-sm">
        <li>
          {p.quantity_available} {p.unit} available
        </li>
        <li>
          Minimum order: {p.min_order_quantity} {p.unit}
        </li>
        {p.location && <li>📍 {p.location}</li>}
        <li className="text-gray-400">
          Sold by {farmerInfo?.business_name || farmerInfo?.full_name || "Farmer"}
        </li>
      </ul>

      {p.description && <p className="mt-4">{p.description}</p>}

      {!current ? (
        <p className="mt-6">
          <Link href="/login" className="text-green-500 underline">
            Log in
          </Link>{" "}
          or{" "}
          <Link href="/register" className="text-green-500 underline">
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
        />
      ) : (
        <p className="mt-6 text-gray-400">Only buyer accounts can place orders.</p>
      )}
    </div>
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="p-6">
      <Link href="/marketplace" className="mb-4 inline-block text-sm text-gray-400 underline">
        ← Back to marketplace
      </Link>
      <Suspense fallback={<p>Loading...</p>}>
        <ProductDetail params={params} />
      </Suspense>
    </main>
  );
}