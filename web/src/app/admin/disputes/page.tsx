import { Suspense } from "react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/format";
import { dateTime } from "@/lib/time";
import { DISPUTE_REASONS, isDisputeReason } from "@/lib/disputes";
import {
  card,
  eyebrow,
  field,
  noticeBad,
  pageTitle,
} from "@/lib/layout";
import {
  ORDER_SELECT,
  codeOf,
  loadPeople,
  peopleIdsFromOrders,
  type AdminOrder,
  type Dispute,
  type Refund,
} from "@/lib/admin-data";
import AdminSection from "@/components/AdminSection";
import AdminOrderCard from "@/components/AdminOrderCard";
import { resolveDispute, markRefundPaid } from "../actions";

const button = "rounded-full px-5 py-2 text-sm font-semibold text-white transition";

async function DisputesContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireRole(["admin"]);
  const { error: actionError } = await searchParams;

  const supabase = await createClient();
  const [disputesRes, refundsRes] = await Promise.all([
    supabase
      .from("disputes")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: true }),
    supabase
      .from("refunds")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
  ]);

  const disputes = (disputesRes.data ?? []) as Dispute[];
  const refunds = (refundsRes.data ?? []) as Refund[];

  const orderIds = [
    ...new Set([
      ...disputes.map((d) => d.order_id),
      ...refunds.map((r) => r.order_id),
    ]),
  ];

  let orders: AdminOrder[] = [];
  const paymentRef = new Map<string, string>();
  if (orderIds.length > 0) {
    const [ordersRes, paymentsRes] = await Promise.all([
      supabase.from("orders").select(ORDER_SELECT).in("id", orderIds),
      supabase
        .from("payments")
        .select("order_id, reference")
        .eq("status", "success")
        .in("order_id", orderIds),
    ]);
    orders = (ordersRes.data ?? []) as unknown as AdminOrder[];
    (paymentsRes.data ?? []).forEach((p) =>
      paymentRef.set(p.order_id as string, p.reference as string)
    );
  }
  const orderById = new Map(orders.map((o) => [o.id, o]));
  const people = await loadPeople(supabase, peopleIdsFromOrders(orders));

  // Signed links for dispute photos (private bucket)
  const photoUrls = new Map<string, string>();
  const allPaths = disputes.flatMap((d) => d.photo_paths ?? []);
  if (allPaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from("dispute-evidence")
      .createSignedUrls(allPaths, 3600);
    (signed ?? []).forEach((s) => {
      if (s.path && s.signedUrl) photoUrls.set(s.path, s.signedUrl);
    });
  }

  const refundTotal = refunds.reduce((s, r) => s + Number(r.amount), 0);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={eyebrow}>Disputes</p>
          <h1 className={`mt-2 ${pageTitle}`}>Disputes and refunds</h1>
        </div>
        <div className={card}>
          <p className="text-sm text-white/60">Refunds to make</p>
          <p className="text-2xl font-bold text-red-300">
            {formatNaira(refundTotal)}
          </p>
        </div>
      </div>

      {actionError && <p className={noticeBad}>{actionError}</p>}

      <AdminSection
        title="Open disputes"
        count={disputes.length}
        empty="No open disputes."
      >
        {disputes.map((d) => {
          const o = orderById.get(d.order_id);
          if (!o) return null;
          const reason = isDisputeReason(d.reason)
            ? DISPUTE_REASONS[d.reason]
            : d.reason;
          return (
            <AdminOrderCard key={d.id} o={o} people={people}>
              <div className="mt-3 rounded-xl border border-red-500/40 bg-red-950/20 p-3">
                <p className="font-semibold text-red-200">
                  Buyer&apos;s report: {reason}
                </p>
                <p className="mt-1 whitespace-pre-wrap">{d.details}</p>
                <p className="mt-1 text-xs text-white/50">
                  Reported {dateTime(d.created_at)} · Paystack reference:{" "}
                  {paymentRef.get(d.order_id) ?? "not found"}
                </p>

                {(d.photo_paths ?? []).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(d.photo_paths ?? []).map((path) => {
                      const url = photoUrls.get(path);
                      return url ? (
                        <a
                          key={path}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt="Evidence"
                            className="h-24 w-24 rounded-xl object-cover"
                          />
                        </a>
                      ) : (
                        <span key={path} className="text-xs text-white/40">
                          Photo unavailable
                        </span>
                      );
                    })}
                  </div>
                )}

                <form
                  action={resolveDispute}
                  className="mt-4 flex flex-col gap-2"
                >
                  <input type="hidden" name="dispute_id" value={d.id} />

                  <div className="flex flex-wrap gap-2">
                    <select
                      name="resolution"
                      defaultValue=""
                      className={field}
                      required
                    >
                      <option value="" className="text-black">
                        Decision
                      </option>
                      <option value="full_refund" className="text-black">
                        Full refund
                      </option>
                      <option value="partial_refund" className="text-black">
                        Partial refund
                      </option>
                      <option value="rejected" className="text-black">
                        Reject (no refund)
                      </option>
                    </select>

                    <input
                      name="refund_amount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Partial refund (₦)"
                      className={`${field} w-44`}
                    />

                    <select
                      name="fault"
                      defaultValue=""
                      className={field}
                      required
                    >
                      <option value="" className="text-black">
                        Whose fault?
                      </option>
                      <option value="farmer" className="text-black">
                        Farmer (bad at pickup)
                      </option>
                      <option value="platform" className="text-black">
                        Farm Depot (driver or transit)
                      </option>
                      <option value="buyer" className="text-black">
                        Buyer
                      </option>
                      <option value="none" className="text-black">
                        No one
                      </option>
                    </select>
                  </div>

                  <textarea
                    name="note"
                    rows={2}
                    placeholder="Your note (only you see this)"
                    className={`${field} w-full`}
                  />

                  <button
                    className={`${button} w-fit bg-red-600 hover:bg-red-500`}
                  >
                    Resolve dispute
                  </button>
                  <p className="text-xs text-white/50">
                    Farmer fault creates a debt for the refund amount (up to what
                    they were paid). Farm Depot fault means the farmer keeps
                    their money and you absorb the cost.
                  </p>
                </form>
              </div>
            </AdminOrderCard>
          );
        })}
      </AdminSection>

      <AdminSection
        title="Refunds to make"
        count={refunds.length}
        empty="No pending refunds."
      >
        {refunds.map((r) => (
          <li key={r.id} className={`${card} text-sm`}>
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold">Order #{codeOf(r.order_id)}</p>
              <p className="text-lg font-bold text-red-300">
                {formatNaira(r.amount)}
              </p>
            </div>
            <p className="text-white/60">
              Paystack reference: {paymentRef.get(r.order_id) ?? "not found"}
            </p>
            <p className="text-xs text-white/50">
              Find this payment in your Paystack dashboard, refund the amount
              there, then record the refund reference or a note here.
            </p>
            <form
              action={markRefundPaid}
              className="mt-3 flex flex-wrap items-center gap-2"
            >
              <input type="hidden" name="refund_id" value={r.id} />
              <input
                name="reference"
                placeholder="Refund reference or note"
                minLength={3}
                className={`${field} w-64`}
                required
              />
              <button className={`${button} bg-green-600 hover:bg-green-500`}>
                Mark as refunded
              </button>
            </form>
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
      <DisputesContent searchParams={searchParams} />
    </Suspense>
  );
}