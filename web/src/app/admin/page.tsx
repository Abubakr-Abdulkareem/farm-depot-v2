import { Suspense } from "react";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/format";
import { card, eyebrow, pageTitle } from "@/lib/layout";

function Stat({
  label,
  value,
  href,
  tone = "",
}: {
  label: string;
  value: string | number;
  href?: string;
  tone?: string;
}) {
  const body = (
    <>
      <p className="text-sm text-white/60">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${tone}`}>{value}</p>
    </>
  );

  return href ? (
    <Link href={href} className={`${card} block transition hover:border-lime-300/60`}>
      {body}
    </Link>
  ) : (
    <div className={card}>{body}</div>
  );
}

const sum = (rows: { amount: number }[] | null) =>
  (rows ?? []).reduce((total, r) => total + Number(r.amount), 0);

async function OverviewContent() {
  const { profile } = await requireRole(["admin"]);
  const supabase = await createClient();

  const [orders, payouts, refunds, disputes, debts, threads, financials] =
    await Promise.all([
      supabase
        .from("orders")
        .select("status")
        .in("status", ["paid", "confirmed", "picked_up", "delivered"]),
      supabase.from("payouts").select("amount").eq("status", "pending"),
      supabase.from("refunds").select("amount").eq("status", "pending"),
      supabase
        .from("disputes")
        .select("id", { count: "exact", head: true })
        .eq("status", "open"),
      supabase.from("farmer_debts").select("amount").eq("status", "open"),
      supabase
        .from("support_threads")
        .select("id", { count: "exact", head: true })
        .eq("status", "open")
        .eq("last_sender_role", "user"),
      supabase.from("order_financials").select("commission_amount"),
    ]);

  const orderRows = (orders.data ?? []) as { status: string }[];
  const count = (s: string) => orderRows.filter((o) => o.status === s).length;

  const readyForPickup = count("confirmed");
  const inTransit = count("picked_up");
  const awaitingCompletion = count("delivered");
  const waitingFarmers = count("paid");
  const openDisputes = disputes.count ?? 0;
  const supportWaiting = threads.count ?? 0;

  const commission = (financials.data ?? []).reduce(
    (total, f) => total + Number(f.commission_amount),
    0
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className={eyebrow}>Admin</p>
        <h1 className={`mt-2 ${pageTitle}`}>Welcome, {profile.full_name}</h1>
      </div>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Needs your attention</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Ready for pickup"
            value={readyForPickup}
            href="/admin/orders"
            tone={readyForPickup > 0 ? "text-yellow-300" : ""}
          />
          <Stat
            label="Delivered, awaiting completion"
            value={awaitingCompletion}
            href="/admin/orders"
            tone={awaitingCompletion > 0 ? "text-yellow-300" : ""}
          />
          <Stat
            label="Open disputes"
            value={openDisputes}
            href="/admin/disputes"
            tone={openDisputes > 0 ? "text-red-300" : ""}
          />
          <Stat
            label="Support needing a reply"
            value={supportWaiting}
            href="/admin/support"
            tone={supportWaiting > 0 ? "text-yellow-300" : ""}
          />
        </div>
        <p className="mt-3 text-sm text-white/60">
          {inTransit} in transit · {waitingFarmers} waiting for farmers to
          confirm
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Money</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Farmer payouts to make"
            value={formatNaira(sum(payouts.data))}
            href="/admin/payouts"
            tone="text-yellow-300"
          />
          <Stat
            label="Refunds to make"
            value={formatNaira(sum(refunds.data))}
            href="/admin/disputes"
            tone="text-red-300"
          />
          <Stat
            label="Open farmer debts"
            value={formatNaira(sum(debts.data))}
            href="/admin/payouts"
          />
          <Stat
            label="Commission recorded"
            value={formatNaira(commission)}
            tone="text-lime-300"
          />
        </div>
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