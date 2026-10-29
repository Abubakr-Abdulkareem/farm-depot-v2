import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/format";
import type { Product, FarmerPublic } from "@/types";

async function ProductList() {
  await connection();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    return <p className="text-red-600">Error: {error.message}</p>;
  }

  const products = (data ?? []) as Product[];

  if (products.length === 0) {
    return <p className="text-gray-400">No products listed yet.</p>;
  }

  const farmerIds = [...new Set(products.map((p) => p.farmer_id))];
  const { data: farmers } = await supabase
    .from("farmer_public")
    .select("*")
    .in("id", farmerIds);

  const farmerName = new Map(
    ((farmers ?? []) as FarmerPublic[]).map((f) => [
      f.id,
      f.business_name || f.full_name || "Farmer",
    ])
  );

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((p) => (
        <li key={p.id}>
          <Link
            href={`/marketplace/${p.id}`}
            className="block rounded border border-gray-700 p-4 hover:border-green-600"
          >
            <h2 className="text-lg font-semibold">{p.name}</h2>
            {p.category && <p className="text-sm text-gray-400">{p.category}</p>}
            <p className="mt-2 text-xl font-bold text-green-500">
              {formatNaira(p.price_per_unit)}
              <span className="text-sm font-normal text-gray-400"> / {p.unit}</span>
            </p>
            <p className="mt-1 text-sm">
              {p.quantity_available} {p.unit} available
            </p>
            <p className="text-sm text-gray-400">
              Min order: {p.min_order_quantity} {p.unit}
            </p>
            {p.location && <p className="text-sm text-gray-400">📍 {p.location}</p>}
            <p className="mt-2 text-sm text-gray-400">
              Sold by {farmerName.get(p.farmer_id) ?? "Farmer"}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function Page() {
  return (
    <main className="p-6">
      <h1 className="mb-4 text-2xl font-bold">Marketplace</h1>
      <Suspense fallback={<p>Loading products...</p>}>
        <ProductList />
      </Suspense>
    </main>
  );
}