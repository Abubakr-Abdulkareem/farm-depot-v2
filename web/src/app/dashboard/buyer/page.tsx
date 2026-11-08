import { Suspense } from "react";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatNaira, formatDate } from "@/lib/format";
import { orderStatusStyle } from "@/lib/status";
import {
  badge,
  card,
  eyebrow,
  ghostButton,
  noticeGood,
  noticeWarn,
  pageTitle,
  primaryButton,
} from "@/lib/layout";

type OrderRow = {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  order_items: {
    quantity: number;
    products: { name: string; unit: string } | null;
  }[];
};

function Stat({
  label,
  value,
  tone = "",
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <Link
      href="/dashboard/buyer/orders"
      className={`${card} block transition hover:border-lime-300/60`}
    >
      <p className="text-sm text-white/60">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${tone}`}>{value}</p>
    </Link>
  );
}

async function OverviewContent() {
  const { profile } = await requireRole(["buyer"]);
  const supabase = await createClient();

  const { data } = await supabase
    .from("orders")
    .select(
      "id, status, total_amount, created_at, order_items(quantity, products(name, unit))"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const orders = (data ?? []) as unknown as OrderRow[];
  const count = (...statuses: string[]) =>
    orders.filter((o) => statuses.includes(o.status)).length;

  const awaitingPayment = count("pending");
  const inProgress = count("paid", "confirmed", "picked_up");
  const toConfirm = count("delivered");
  const completed = count("completed");
  const recent = orders.slice(0, 3);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={eyebrow}>Buyer dashboard</p>
          <h1 className={`mt-2 ${pageTitle}`}>Welcome, {profile.full_name}</h1>
        </div>
        <Link href="/marketplace" className={`${primaryButton} py-2 text-sm`}>
          Browse the marketplace
        </Link>
      </div>

      {awaitingPayment > 0 && (
        <p className={noticeWarn}>
          You have {awaitingPayment} order{awaitingPayment === 1 ? "" : "s"}{" "}
          waiting for payment.{" "}
          <Link
            href="/dashboard/buyer/orders"
            className="font-semibold underline"
          >
            Pay now
          </Link>
        </p>
      )}

      {toConfirm > 0 && (
        <p className={noticeGood}>
          {toConfirm} delivered order{toConfirm === 1 ? "" : "s"} need
          {toConfirm === 1 ? "s" : ""} your confirmation.{" "}
          <Link
            href="/dashboard/buyer/orders"
            className="font-semibold underline"
          >
            Review
          </Link>
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Waiting for payment"
          value={awaitingPayment}
          tone={awaitingPayment > 0 ? "text-yellow-300" : ""}
        />
        <Stat label="In progress" value={inProgress} />
        <Stat
          label="Delivered, to confirm"
          value={toConfirm}
          tone={toConfirm > 0 ? "text-lime-300" : ""}
        />
        <Stat label="Completed" value={completed} />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">Recent orders</h2>
          <Link
            href="/dashboard/buyer/orders"
            className="text-sm font-semibold text-lime-300 hover:underline"
          >
            See all orders →
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className={card}>
            <p className="text-white/70">You haven&apos;t placed any orders yet.</p>
            <Link href="/marketplace" className={`${ghostButton} mt-3 inline-block`}>
              Find produce
            </Link>
          </div>
        ) : (
          <ul className="grid gap-3 lg:grid-cols-3">
            {recent.map((o) => (
              <li key={o.id} className={card}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-white/60">
                    {formatDate(o.created_at)}
                  </p>
                  <span
                    className={`${badge} ${
                      orderStatusStyle[o.status] ?? "bg-gray-800 text-gray-200"
                    }`}
                  >
                    {o.status.replace("_", " ")}
                  </span>
                </div>
                {o.order_items.map((item, i) => (
                  <p key={i} className="mt-2 font-medium">
                    {item.products?.name ?? "Product"}: {item.quantity}{" "}
                    {item.products?.unit ?? ""}
                  </p>
                ))}
                <p className="mt-2 font-bold text-lime-300">
                  {formatNaira(o.total_amount)}
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
    <Suspense fallback={<p className="text-white/60">Loading...</p>}>
      <OverviewContent />
    </Suspense>
  );
}