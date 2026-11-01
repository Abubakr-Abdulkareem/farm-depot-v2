import { Suspense } from "react";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatNaira, formatDate } from "@/lib/format";
import LogoutButton from "@/components/LogoutButton";
import { payForOrder, confirmReceipt } from "./actions";

type OrderRow = {
  id: string;
  status: string;
  total_amount: number;
  items_total: number | null;
  delivery_fee: number | null;
  delivery_state: string | null;
  delivery_address: string | null;
  delivery_code: string | null;
  created_at: string;
  order_items: {
    quantity: number;
    unit_price: number;
    products: { name: string; unit: string } | null;
  }[];
};

type Params = { payment?: string; receipt?: string };

const statusStyle: Record<string, string> = {
  pending: "bg-gray-800 text-gray-300",
  paid: "bg-yellow-900 text-yellow-300",
  confirmed: "bg-blue-900 text-blue-300",
  picked_up: "bg-purple-900 text-purple-300",
  delivered: "bg-green-900 text-green-300",
  completed: "bg-green-900 text-green-300",
  cancelled: "bg-red-900 text-red-300",
};

async function BuyerContent({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const { profile } = await requireRole(["buyer"]);
  const { payment, receipt } = await searchParams;

  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select(
      "id, status, total_amount, items_total, delivery_fee, delivery_state, delivery_address, delivery_code, created_at, order_items(quantity, unit_price, products(name, unit))"
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
      {receipt === "done" && (
        <p className="rounded border border-green-600 p-3 text-green-500">
          Thanks for confirming. The order is complete.
        </p>
      )}
      {receipt === "error" && (
        <p className="rounded border border-red-600 p-3 text-red-500">
          We couldn&apos;t complete that order. Please try again.
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
                  <span
                    className={`rounded px-2 py-0.5 text-xs uppercase ${
                      statusStyle[o.status] ?? "bg-gray-800"
                    }`}
                  >
                    {o.status.replace("_", " ")}
                  </span>
                </div>

                {o.order_items.map((item, i) => (
                  <p key={i} className="mt-1">
                    {item.products?.name ?? "Product"}: {item.quantity}{" "}
                    {item.products?.unit ?? ""} × {formatNaira(item.unit_price)}
                  </p>
                ))}

                {o.delivery_address && (
                  <p className="mt-2 text-sm text-gray-400">
                    Delivering to: {o.delivery_address}
                    {o.delivery_state ? `, ${o.delivery_state}` : ""}
                  </p>
                )}

                <div className="mt-2 text-sm">
                  {o.items_total !== null && (
                    <p className="flex justify-between">
                      <span>Produce</span>
                      <span>{formatNaira(o.items_total)}</span>
                    </p>
                  )}
                  {o.delivery_fee !== null && Number(o.delivery_fee) > 0 && (
                    <p className="flex justify-between">
                      <span>Delivery</span>
                      <span>{formatNaira(o.delivery_fee)}</span>
                    </p>
                  )}
                </div>

                <p className="mt-1 font-bold text-green-500">
                  Total: {formatNaira(o.total_amount)}
                </p>

                {o.status === "picked_up" &&
                  o.delivery_code && (
                    <p className="mt-3 rounded border border-yellow-700 p-2 text-sm text-yellow-300">
                      Delivery code:{" "}
                      <span className="font-mono text-lg font-bold">
                        {o.delivery_code}
                      </span>
                      <br />
                      Give this code to the driver only after you have received
                      and checked your goods.
                    </p>
                  )}

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

                {o.status === "delivered" && (
                  <div className="mt-3 rounded border border-green-700 p-3 text-sm">
                    <p>
                      Your goods were delivered. If everything is as expected,
                      confirm receipt to complete the order. If something is
                      wrong, don&apos;t confirm and contact Farm Depot.
                    </p>
                    <form action={confirmReceipt} className="mt-2">
                      <input type="hidden" name="order_id" value={o.id} />
                      <button className="rounded bg-green-600 px-4 py-2 font-semibold text-white">
                        I received my goods
                      </button>
                    </form>
                  </div>
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
  searchParams: Promise<Params>;
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