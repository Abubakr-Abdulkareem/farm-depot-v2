import { Suspense } from "react";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatNaira, formatDate } from "@/lib/format";
import LogoutButton from "@/components/LogoutButton";

type OrderRow = {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  order_items: {
    quantity: number;
    unit_price: number;
    products: { name: string; unit: string } | null;
  }[];
};

async function BuyerContent() {
  const { profile } = await requireRole(["buyer"]);

  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select(
      "id, status, total_amount, created_at, order_items(quantity, unit_price, products(name, unit))"
    )
    .order("created_at", { ascending: false });

  const orders = (data ?? []) as unknown as OrderRow[];

  return (
    <div className="mt-4 flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <p>Welcome, {profile.full_name}</p>
        <LogoutButton />
      </div>

      <Link href="/marketplace" className="text-green-500 underline">
        Browse the marketplace
      </Link>

      <section>
        <h2 className="mb-3 text-xl font-semibold">
          Your orders ({orders.length})
        </h2>
        {orders.length === 0 ? (
          <p className="text-gray-400">You haven&apos;t placed any orders yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {orders.map((o) => (
              <li key={o.id} className="rounded border border-gray-700 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-400">{formatDate(o.created_at)}</p>
                  <span className="rounded bg-gray-800 px-2 py-0.5 text-xs uppercase">
                    {o.status}
                  </span>
                </div>
                {o.order_items.map((item, i) => (
                  <p key={i} className="mt-1">
                    {item.products?.name ?? "Product"}: {item.quantity}{" "}
                    {item.products?.unit ?? ""} × {formatNaira(item.unit_price)}
                  </p>
                ))}
                <p className="mt-2 font-bold text-green-500">
                  Total: {formatNaira(o.total_amount)}
                </p>
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
      <h1 className="text-2xl font-bold">Buyer dashboard</h1>
      <Suspense fallback={<p>Loading...</p>}>
        <BuyerContent />
      </Suspense>
    </main>
  );
}