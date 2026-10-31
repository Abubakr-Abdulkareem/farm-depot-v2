import { Suspense } from "react";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatNaira, formatDate } from "@/lib/format";
import LogoutButton from "@/components/LogoutButton";
import { payForOrder } from "./actions";

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

async function BuyerContent({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>;
}) {
  const { profile } = await requireRole(["buyer"]);
  const { payment } = await searchParams;

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

      {payment === "success" && (
        <p className="rounded border border-green-600 p-3 text-green-500">
          Payment received. Thank you!
        </p>
      )}
      {payment === "duplicate" && (
        <p className="rounded border border-yellow-600 p-3 text-yellow-500">
          This order was already paid, so this extra payment will need to be
          refunded.
        </p>
      )}
      {(payment === "failed" || payment === "error") && (
        <p className="rounded border border-red-600 p-3 text-red-500">
          Payment was not completed. You can try again below.
        </p>
      )}

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
                  <p className="text-sm text-gray-400">
                    {formatDate(o.created_at)}
                  </p>
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
                {o.status === "pending" && (
                  <form action={payForOrder} className="mt-3">
                    <input type="hidden" name="order_id" value={o.id} />
                    <button
                      type="submit"
                      className="rounded bg-green-600 px-4 py-2 font-semibold text-white"
                    >
                      Pay now
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>;
}) {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Buyer dashboard</h1>
      <Suspense fallback={<p>Loading...</p>}>
        <BuyerContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}