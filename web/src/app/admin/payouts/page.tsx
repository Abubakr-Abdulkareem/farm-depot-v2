import { Suspense } from "react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/format";
import { dateTime } from "@/lib/time";
import {
  card,
  eyebrow,
  field,
  noticeBad,
  noticeWarn,
  pageTitle,
} from "@/lib/layout";
import {
  codeOf,
  loadPeople,
  personName,
  type Debt,
  type Payout,
} from "@/lib/admin-data";
import AdminSection from "@/components/AdminSection";
import { markPayoutPaid, settleDebt } from "../actions";

const button =
  "rounded-full bg-green-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-green-500";

async function PayoutsContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireRole(["admin"]);
  const { error: actionError } = await searchParams;

  const supabase = await createClient();
  const [payoutsRes, debtsRes] = await Promise.all([
    supabase
      .from("payouts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("farmer_debts")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: true }),
  ]);

  const payouts = (payoutsRes.data ?? []) as Payout[];
  const debts = (debtsRes.data ?? []) as Debt[];

  const ids = new Set<string>();
  payouts.forEach((p) => ids.add(p.farmer_id));
  debts.forEach((d) => ids.add(d.farmer_id));
  const people = await loadPeople(supabase, ids);

  const pending = payouts.filter((p) => p.status === "pending");
  const paid = payouts.filter((p) => p.status === "paid").slice(0, 15);
  const pendingTotal = pending.reduce((s, p) => s + Number(p.amount), 0);

  const debtByFarmer = new Map<string, number>();
  debts.forEach((d) =>
    debtByFarmer.set(
      d.farmer_id,
      (debtByFarmer.get(d.farmer_id) ?? 0) + Number(d.amount)
    )
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={eyebrow}>Payouts</p>
          <h1 className={`mt-2 ${pageTitle}`}>Farmer payouts</h1>
        </div>
        <div className={card}>
          <p className="text-sm text-white/60">To pay out now</p>
          <p className="text-2xl font-bold text-yellow-300">
            {formatNaira(pendingTotal)}
          </p>
        </div>
      </div>

      {actionError && <p className={noticeBad}>{actionError}</p>}

      <AdminSection
        title="Payouts to make"
        count={pending.length}
        empty="No pending payouts."
      >
        {pending.map((p) => {
          const farmer = people.get(p.farmer_id);
          const owed = debtByFarmer.get(p.farmer_id) ?? 0;
          return (
            <li key={p.id} className={`${card} text-sm`}>
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">
                  {p.kind === "pickup" ? "Pickup payment" : "Final payment"} ·
                  Order #{codeOf(p.order_id)}
                </p>
                <p className="text-lg font-bold text-yellow-300">
                  {formatNaira(p.amount)}
                </p>
              </div>
              <p className="mt-1">
                Pay: {personName(farmer)} · Phone:{" "}
                {farmer?.phone ?? "not added yet"}
              </p>
              {owed > 0 && (
                <p className={`${noticeWarn} mt-2`}>
                  This farmer has {formatNaira(owed)} in open debts. Consider
                  deducting it from this payout.
                </p>
              )}
              <p className="mt-1 text-xs text-white/50">
                Get the farmer&apos;s bank details by phone, pay by transfer,
                then record the reference here.
              </p>
              <form
                action={markPayoutPaid}
                className="mt-3 flex flex-wrap items-center gap-2"
              >
                <input type="hidden" name="payout_id" value={p.id} />
                <input
                  name="reference"
                  placeholder="Transfer reference or note"
                  minLength={3}
                  className={`${field} w-64`}
                  required
                />
                <button className={button}>Mark as paid</button>
              </form>
            </li>
          );
        })}
      </AdminSection>

      <AdminSection
        title="Farmer debts"
        count={debts.length}
        empty="No open farmer debts."
      >
        {debts.map((d) => (
          <li key={d.id} className={`${card} text-sm`}>
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold">
                {personName(people.get(d.farmer_id))} · Phone:{" "}
                {people.get(d.farmer_id)?.phone ?? "not added yet"}
              </p>
              <p className="text-lg font-bold text-yellow-300">
                {formatNaira(d.amount)}
              </p>
            </div>
            <p className="mt-1 text-xs text-white/50">
              Deduct this from the farmer&apos;s next payout, or collect it,
              then mark it settled.
            </p>
            <form
              action={settleDebt}
              className="mt-3 flex flex-wrap items-center gap-2"
            >
              <input type="hidden" name="debt_id" value={d.id} />
              <input
                name="note"
                placeholder="How it was settled (optional)"
                className={`${field} w-64`}
              />
              <button className={button}>Mark as settled</button>
            </form>
          </li>
        ))}
      </AdminSection>

      <AdminSection
        title="Recently paid"
        count={paid.length}
        empty="Nothing paid out yet."
      >
        {paid.map((p) => (
          <li
            key={p.id}
            className={`${card} flex items-center justify-between gap-3 text-sm`}
          >
            <div>
              <p>
                {personName(people.get(p.farmer_id))} · Order #
                {codeOf(p.order_id)} · {p.kind}
              </p>
              <p className="text-xs text-white/50">
                {p.paid_at ? dateTime(p.paid_at) : ""} · Ref: {p.reference}
              </p>
            </div>
            <p className="font-bold text-lime-300">{formatNaira(p.amount)}</p>
          </li>
        ))}
      </AdminSection>
    </div>
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <Suspense fallback={<p className="text-white/60">Loading...</p>}>
      <PayoutsContent searchParams={searchParams} />
    </Suspense>
  );
}