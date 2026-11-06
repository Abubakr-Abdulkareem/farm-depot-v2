import { Suspense } from "react";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatNaira, formatDate } from "@/lib/format";
import LogoutButton from "@/components/LogoutButton";
import DisputeForm from "@/components/DisputeForm";
import {
  badge,
  card,
  container,
  eyebrow,
  ghostButton,
  noticeBad,
  noticeGood,
  noticeWarn,
  primaryButton,
} from "@/lib/layout";
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

type DisputeRow = {
  order_id: string;
  status: string;
  resolution: string | null;
  refund_amount: number;
};

type Params = { payment?: string; receipt?: string; dispute?: string };

const statusStyle: Record<string, string> = {
  pending: "bg-gray-800 text-gray-300",
  paid: "bg-yellow-900 text-yellow-300",
  confirmed: "bg-blue-900 text-blue-300",
  picked_up: "bg-purple-900 text-purple-300",
  delivered: "bg-green-900 text-green-300",
  completed: "bg-green-900 text-green-300",
  disputed: "bg-red-900 text-red-300",
  refunded: "bg-gray-700 text-gray-200",
  cancelled: "bg-red-900 text-red-300",
};

function disputeOutcome(d: DisputeRow) {
  if (d.status === "open") {
    return "Problem reported. Farm Depot is reviewing it and will be in touch.";
  }
  if (d.resolution === "full_refund") {
    return `Your report was approved. We will refund ${formatNaira(
      d.refund_amount
    )} to your original payment method.`;
  }
  if (d.resolution === "partial_refund") {
    return `Your report was partly approved. We will refund ${formatNaira(
      d.refund_amount
    )} to your original payment method.`;
  }
  return "We reviewed your report and found no grounds for a refund. The order is closed.";
}

async function BuyerContent({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const { profile } = await requireRole(["buyer"]);
  const { payment, receipt, dispute } = await searchParams;

  const supabase = await createClient();
  const [{ data }, { data: disputeData }] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "id, status, total_amount, items_total, delivery_fee, delivery_state, delivery_address, delivery_code, created_at, order_items(quantity, unit_price, products(name, unit))"
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("disputes")
      .select("order_id, status, resolution, refund_amount"),
  ]);

  const orders = (data ?? []) as unknown as OrderRow[];
  const disputes = new Map(
    ((disputeData ?? []) as DisputeRow[]).map((d) => [d.order_id, d])
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={eyebrow}>Buyer dashboard</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
            Welcome, {profile.full_name}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/marketplace" className={ghostButton}>
            Browse the marketplace
          </Link>
          <LogoutButton />
        </div>
      </div>

      {payment === "success" && (
        <p className={noticeGood}>Payment received. Thank you!</p>
      )}
      {payment === "duplicate" && (
        <p className={noticeWarn}>
          This order was already paid, so this extra payment will need to be
          refunded.
        </p>
      )}
      {(payment === "failed" || payment === "error") && (
        <p className={noticeBad}>
          Payment was not completed. You can try again below.
        </p>
      )}
      {receipt === "done" && (
        <p className={noticeGood}>Thanks for confirming. The order is complete.</p>
      )}
      {receipt === "error" && (
        <p className={noticeBad}>
          We couldn&apos;t complete that order. Please try again.
        </p>
      )}
      {dispute === "opened" && (
        <p className={noticeWarn}>
          Your report has been sent. Farm Depot will review it.
        </p>
      )}

      <section>
        <h2 className="mb-4 text-xl font-semibold">
          Your orders ({orders.length})
        </h2>
        {orders.length === 0 ? (
          <p className="text-white/60">You haven&apos;t placed any orders yet.</p>
        ) : (
          <ul className="grid items-start gap-4 lg:grid-cols-2">
            {orders.map((o) => {
              const d = disputes.get(o.id);
              return (
                <li key={o.id} className={card}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-white/60">
                      {formatDate(o.created_at)}
                    </p>
                    <span
                      className={`${badge} ${
                        statusStyle[o.status] ?? "bg-gray-800 text-gray-200"
                      }`}
                    >
                      {o.status.replace("_", " ")}
                    </span>
                  </div>

                  {o.order_items.map((item, i) => (
                    <p key={i} className="mt-2 font-medium">
                      {item.products?.name ?? "Product"}: {item.quantity}{" "}
                      {item.products?.unit ?? ""} ×{" "}
                      {formatNaira(item.unit_price)}
                    </p>
                  ))}

                  {o.delivery_address && (
                    <p className="mt-2 text-sm text-white/60">
                      Delivering to: {o.delivery_address}
                      {o.delivery_state ? `, ${o.delivery_state}` : ""}
                    </p>
                  )}

                  <div className="mt-3 space-y-1 border-t border-white/10 pt-3 text-sm">
                    {o.items_total !== null && (
                      <p className="flex justify-between">
                        <span className="text-white/70">Produce</span>
                        <span>{formatNaira(o.items_total)}</span>
                      </p>
                    )}
                    {o.delivery_fee !== null && Number(o.delivery_fee) > 0 && (
                      <p className="flex justify-between">
                        <span className="text-white/70">Delivery</span>
                        <span>{formatNaira(o.delivery_fee)}</span>
                      </p>
                    )}
                    <p className="flex justify-between text-base font-bold text-lime-300">
                      <span>Total</span>
                      <span>{formatNaira(o.total_amount)}</span>
                    </p>
                  </div>

                  {["paid", "confirmed", "picked_up"].includes(o.status) &&
                    o.delivery_code && (
                      <p className={`${noticeWarn} mt-3 text-sm`}>
                        Delivery code:{" "}
                        <span className="font-mono text-lg font-bold">
                          {o.delivery_code}
                        </span>
                        <br />
                        Give this code to the driver only after you have
                        received and checked your goods.
                      </p>
                    )}

                  {d && (
                    <p className="mt-3 rounded-xl border border-white/15 p-3 text-sm">
                      {disputeOutcome(d)}
                    </p>
                  )}

                  {o.status === "pending" && (
                    <form action={payForOrder} className="mt-3">
                      <input type="hidden" name="order_id" value={o.id} />
                      <button type="submit" className={primaryButton}>
                        Pay now
                      </button>
                    </form>
                  )}

                  {o.status === "delivered" && (
                    <div className="mt-3 rounded-xl border border-lime-300/30 p-3 text-sm">
                      <p>
                        Your goods were delivered. If everything is as expected,
                        confirm receipt to complete the order. If something is
                        wrong, report a problem instead.
                      </p>
                      <form action={confirmReceipt} className="mt-3">
                        <input type="hidden" name="order_id" value={o.id} />
                        <button className={`${primaryButton} py-2 text-sm`}>
                          I received my goods
                        </button>
                      </form>
                      <DisputeForm orderId={o.id} />
                    </div>
                  )}
                </li>
              );
            })}
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
    <main className={`${container} py-8`}>
      <Suspense fallback={<p className="text-white/60">Loading...</p>}>
        <BuyerContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}