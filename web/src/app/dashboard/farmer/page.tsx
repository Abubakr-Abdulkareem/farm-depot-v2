import { Suspense } from "react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/LogoutButton";
import ProductForm from "@/components/ProductForm";
import { deleteProduct } from "./actions";
import type { Product } from "@/types";

async function FarmerContent() {
  const { user, profile } = await requireRole(["farmer"]);

  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("farmer_id", user.id)
    .order("created_at", { ascending: false });

  const products = (data ?? []) as Product[];

  return (
    <div className="mt-4 flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <p>Welcome, {profile.full_name}</p>
        <LogoutButton />
      </div>

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
                className="flex items-center justify-between rounded border border-gray-700 p-3"
              >
                <div>
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-sm text-gray-400">
                    ₦{Number(p.price_per_unit).toLocaleString("en-NG")} per {p.unit} ·{" "}
                    {p.quantity_available} {p.unit} available · min order{" "}
                    {p.min_order_quantity}
                  </p>
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