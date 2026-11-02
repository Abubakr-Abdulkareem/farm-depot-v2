import { Suspense } from "react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatNaira, formatDate } from "@/lib/format";
import { DISPUTE_REASONS, isDisputeReason } from "@/lib/disputes";
import LogoutButton from "@/components/LogoutButton";
import {
  markPickedUp,
  markDelivered,
  completeOrder,
  markPayoutPaid,
  resolveDispute,
  markRefundPaid,
  settleDebt,
} from "./actions";

type OrderItem = {
  quantity: number;
  unit_price: number;
  products: {
    name: string;
    unit: string;
    farmer_id: string;
    origin_state: string | null;
    location: string | null;
  } | null;
};

type AdminOrder = {
  id: string;
  status: string;
  total_amount: number;
  items_total: number | null;
  delivery_fee: number | null;
  delivery_state: string | null;
  delivery_address: string | null;
  delivery_phone: string | null;
  created_at: string;
  delivered_at: string | null;
  buyer_id: string;
  order_items: OrderItem[];
};

type Person = {
  id: string;
  full_name: string | null;
  business_name: string | null;
  phone: string | null;
  location: string | null;
};

type Payout = {
  id: string;
  order_id: string;
  farmer_id: string;
  kind: string;
  amount: number;
  status: string;
  reference: string | null;
  paid_at: string | null;
  created_at: string;
};

type Dispute = {
  id: string;
  order_id: string;
  buyer_id: string;
  reason: string;
  details: string;
  photo_paths: string[] | null;
  status: string;
  created_at: string;
};

type Refund = {
  id: string;
  order_id: string;
  amount: number;
  status: string;
  reference: string | null;
  paid_at: string | null;
  created_at: string;
};

type Debt = {
  id: string;
  farmer_id: string;
  dispute_id: string;
  amount: number;
  status: string;
  created_at: string;
};

const codeOf = (id: string) => id.replace(/-/g, "").slice(0, 8).toUpperCase();

const personName = (p?: Person) =>
  p ? p.business_name || p.full_name || "Unnamed" : "Unknown";

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  });

const input = "rounded border border-gray-600 bg-transparent p-2 text-sm";
const button = "rounded px-4 py-2 text-sm font-semibold text-white";

function Section({
  title,
  count,
  empty,
  children,
}: {
  title: string;
  count: number;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 text-xl font-semibold">
        {title} ({count})
      </h2>
      {count === 0 ? (
        <p className="text-gray-400">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-3">{children}</ul>
      )}
    </section>
  );
}

function OrderCard({
  o,
  people,
  children,
}: {
  o: AdminOrder;
  people: Map<string, Person>;
  children?: React.ReactNode;
}) {
  const first = o.order_items[0];
  const farmerId = first?.products?.farmer_id;
  const farmer = farmerId ? people.get(farmerId) : undefined;
  const buyer = people.get(o.buyer_id);
  const area = [first?.products?.location, first?.products?.origin_state]
    .filter(Boolean)
    .join(", ");

  return (
    <li className="rounded border border-gray-700 p-3 text-sm">
      <div className="flex items-center justify-between">
        <p className="font-semibold">Order #{codeOf(o.id)}</p>
        <p className="text-gray-400">{formatDate(o.created_at)}</p>
      </div>

      {o.order_items.map((i, idx) => (
        <p key={idx} className="mt-1">
          {i.products?.name ?? "Product"}: {i.quantity} {i.products?.unit ?? ""} ×{" "}
          {formatNaira(i.unit_price)}
        </p>
      ))}

      <p className="mt-1 text-gray-400">
        Produce {formatNaira(o.items_total ?? 0)} + delivery{" "}
        {formatNaira(o.delivery_fee ?? 0)} ={" "}
        <span className="font-bold text-green-500">
          {formatNaira(o.total_amount)}
        </span>
      </p>

      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <div className="rounded bg-gray-900 p-2">
          <p className="font-semibold">Pick up from</p>
          <p>{personName(farmer)}</p>
          <p>Phone: {farmer?.phone ?? "not added yet"}</p>
          <p>Address: {farmer?.location ?? "not added yet"}</p>
          {area && <p className="text-gray-400">Listing area: {area}</p>}
        </div>
        <div className="rounded bg-gray-900 p-2">
          <p className="font-semibold">Deliver to</p>
          <p>{personName(buyer)}</p>
          <p>Phone: {o.delivery_phone ?? "none"}</p>
          <p>
            Address: {o.delivery_address ?? "none"}
            {o.delivery_state ? `, ${o.delivery_state}` : ""}
          </p>
        </div>
      </div>

      {children}
    </li>
  );
}

async function AdminContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { profile } = await requireRole(["admin"]);
  const { error: actionError } = await searchParams;

  const supabase = await createClient();

  const [
    ordersRes,
    payoutsRes,
    financialsRes,
    disputesRes,
    refundsRes,
    debtsRes,
  ] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "id, status, total_amount, items_total, delivery_fee, delivery_state, delivery_address, delivery_phone, created_at, delivered_at, buyer_id, order_items(quantity, unit_price, products(name, unit, farmer_id, origin_state, location))"
      )
      .in("status", ["paid", "confirmed", "picked_up", "delivered", "disputed"])
      .order("created_at", { ascending: true }),
    supabase
      .from("payouts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(60),
    supabase.from("order_financials").select("commission_amount"),
    supabase
      .from("disputes")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: true }),
    supabase
      .from("refunds")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(60),
    supabase
      .from("farmer_debts")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: true }),
  ]);

  const orders = (ordersRes.data ?? []) as unknown as AdminOrder[];
  const payouts = (payoutsRes.data ?? []) as Payout[];
  const openDisputes = (disputesRes.data ?? []) as Dispute[];
  const refunds = (refundsRes.data ?? []) as Refund[];
  const debts = (debtsRes.data ?? []) as Debt[];
  const commissionTotal = (financialsRes.data ?? []).reduce(
    (sum, f) => sum + Number(f.commission_amount),
    0
  );

  const orderById = new Map(orders.map((o) => [o.id, o]));

  // People (buyers, farmers)
  const ids = new Set<string>();
  orders.forEach((o) => {
    ids.add(o.buyer_id);
    o.order_items.forEach((i) => {
      if (i.products) ids.add(i.products.farmer_id);
    });
  });
  payouts.forEach((p) => ids.add(p.farmer_id));
  debts.forEach((d) => ids.add(d.farmer_id));
  openDisputes.forEach((d) => ids.add(d.buyer_id));

  let peopleList: Person[] = [];
  if (ids.size > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, business_name, phone, location")
      .in("id", [...ids]);
    peopleList = (data ?? []) as Person[];
  }
  const people = new Map(peopleList.map((p) => [p.id, p]));

  // Paystack references for disputed and refunded orders
  const refOrderIds = [
    ...new Set([
      ...openDisputes.map((d) => d.order_id),
      ...refunds.map((r) => r.order_id),
    ]),
  ];
  const paymentRef = new Map<string, string>();
  if (refOrderIds.length > 0) {
    const { data } = await supabase
      .from("payments")
      .select("order_id, reference")
      .eq("status", "success")
      .in("order_id", refOrderIds);
    (data ?? []).forEach((p) =>
      paymentRef.set(p.order_id as string, p.reference as string)
    );
  }

  // Signed links for dispute photos (private bucket)
  const photoUrls = new Map<string, string>();
  const allPaths = openDisputes.flatMap((d) => d.photo_paths ?? []);
  if (allPaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from("dispute-evidence")
      .createSignedUrls(allPaths, 3600);
    (signed ?? []).forEach((s) => {
      if (s.path && s.signedUrl) photoUrls.set(s.path, s.signedUrl);
    });
  }

  const byStatus = (s: string) => orders.filter((o) => o.status === s);
  const pendingPayouts = payouts.filter((p) => p.status === "pending");
  const paidPayouts = payouts.filter((p) => p.status === "paid").slice(0, 10);
  const pendingRefunds = refunds.filter((r) => r.status === "pending");
  const pendingTotal = pendingPayouts.reduce((s, p) => s + Number(p.amount), 0);
  const refundTotal = pendingRefunds.reduce((s, r) => s + Number(r.amount), 0);

  const debtByFarmer = new Map<string, number>();
  debts.forEach((d) =>
    debtByFarmer.set(
      d.farmer_id,
      (debtByFarmer.get(d.farmer_id) ?? 0) + Number(d.amount)
    )
  );

  return (
    <div className="mt-4 flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <p>Welcome, {profile.full_name}</p>
        <LogoutButton />
      </div>

      {actionError && (
        <p className="rounded border border-red-600 p-3 text-red-500">
          {actionError}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded border border-gray-700 p-3">
          <p className="text-sm text-gray-400">Farmer payouts to make</p>
          <p className="text-2xl font-bold text-yellow-400">
            {formatNaira(pendingTotal)}
          </p>
        </div>
        <div className="rounded border border-gray-700 p-3">
          <p className="text-sm text-gray-400">Refunds to make</p>
          <p className="text-2xl font-bold text-red-400">
            {formatNaira(refundTotal)}
          </p>
        </div>
        <div className="rounded border border-gray-700 p-3">
          <p className="text-sm text-gray-400">Open disputes</p>
          <p className="text-2xl font-bold">{openDisputes.length}</p>
        </div>
        <div className="rounded border border-gray-700 p-3">
          <p className="text-sm text-gray-400">Commission recorded</p>
          <p className="text-2xl font-bold text-green-500">
            {formatNaira(commissionTotal)}
          </p>
        </div>
      </div>

      <Section
        title="Open disputes"
        count={openDisputes.length}
        empty="No open disputes."
      >
        {openDisputes.map((d) => {
          const o = orderById.get(d.order_id);
          if (!o) return null;
          const reason = isDisputeReason(d.reason)
            ? DISPUTE_REASONS[d.reason]
            : d.reason;
          return (
            <OrderCard key={d.id} o={o} people={people}>
              <div className="mt-3 rounded border border-red-800 p-3">
                <p className="font-semibold text-red-300">
                  Buyer&apos;s report: {reason}
                </p>
                <p className="mt-1 whitespace-pre-wrap">{d.details}</p>
                <p className="mt-1 text-xs text-gray-400">
                  Reported {dateTime(d.created_at)} · Paystack reference:{" "}
                  {paymentRef.get(d.order_id) ?? "not found"}
                </p>

                {(d.photo_paths ?? []).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
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
                            className="h-24 w-24 rounded object-cover"
                          />
                        </a>
                      ) : (
                        <span key={path} className="text-xs text-gray-500">
                          Photo unavailable
                        </span>
                      );
                    })}
                  </div>
                )}

                <form action={resolveDispute} className="mt-3 flex flex-col gap-2">
                  <input type="hidden" name="dispute_id" value={d.id} />

                  <div className="flex flex-wrap gap-2">
                    <select
                      name="resolution"
                      defaultValue=""
                      className={input}
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
                      className={`${input} w-44`}
                    />

                    <select
                      name="fault"
                      defaultValue=""
                      className={input}
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
                    className={`${input} w-full`}
                  />

                  <button className={`${button} w-fit bg-red-600`}>
                    Resolve dispute
                  </button>
                  <p className="text-xs text-gray-400">
                    Farmer fault creates a debt for the refund amount (up to what
                    they were paid). Farm Depot fault means the farmer keeps
                    their money and you absorb the cost.
                  </p>
                </form>
              </div>
            </OrderCard>
          );
        })}
      </Section>

      <Section
        title="Refunds to make"
        count={pendingRefunds.length}
        empty="No pending refunds."
      >
        {pendingRefunds.map((r) => (
          <li key={r.id} className="rounded border border-gray-700 p-3 text-sm">
            <div className="flex items-center justify-between">
              <p className="font-semibold">Order #{codeOf(r.order_id)}</p>
              <p className="text-lg font-bold text-red-400">
                {formatNaira(r.amount)}
              </p>
            </div>
            <p className="text-gray-400">
              Paystack reference: {paymentRef.get(r.order_id) ?? "not found"}
            </p>
            <p className="text-xs text-gray-400">
              Find this payment in your Paystack dashboard, refund the amount
              there, then record the refund reference or a note here.
            </p>
            <form action={markRefundPaid} className="mt-2 flex flex-wrap items-center gap-2">
              <input type="hidden" name="refund_id" value={r.id} />
              <input
                name="reference"
                placeholder="Refund reference or note"
                minLength={3}
                className={`${input} w-64`}
                required
              />
              <button className={`${button} bg-green-600`}>Mark as refunded</button>
            </form>
          </li>
        ))}
      </Section>

      <Section
        title="Farmer debts"
        count={debts.length}
        empty="No open farmer debts."
      >
        {debts.map((d) => (
          <li key={d.id} className="rounded border border-gray-700 p-3 text-sm">
            <div className="flex items-center justify-between">
              <p className="font-semibold">
                {personName(people.get(d.farmer_id))} · Phone:{" "}
                {people.get(d.farmer_id)?.phone ?? "not added yet"}
              </p>
              <p className="text-lg font-bold text-yellow-400">
                {formatNaira(d.amount)}
              </p>
            </div>
            <p className="text-xs text-gray-400">
              Deduct this from the farmer&apos;s next payout, or collect it, then
              mark it settled.
            </p>
            <form action={settleDebt} className="mt-2 flex flex-wrap items-center gap-2">
              <input type="hidden" name="debt_id" value={d.id} />
              <input
                name="note"
                placeholder="How it was settled (optional)"
                className={`${input} w-64`}
              />
              <button className={`${button} bg-green-600`}>Mark as settled</button>
            </form>
          </li>
        ))}
      </Section>

      <Section
        title="Ready for pickup"
        count={byStatus("confirmed").length}
        empty="No confirmed orders waiting for pickup."
      >
        {byStatus("confirmed").map((o) => (
          <OrderCard key={o.id} o={o} people={people}>
            <form action={markPickedUp} className="mt-3">
              <input type="hidden" name="order_id" value={o.id} />
              <button className={`${button} bg-blue-600`}>
                Mark as picked up (pays the farmer in full)
              </button>
              <p className="mt-1 text-xs text-gray-400">
                Only after the driver has counted and checked the goods.
              </p>
            </form>
          </OrderCard>
        ))}
      </Section>

      <Section
        title="In transit"
        count={byStatus("picked_up").length}
        empty="Nothing in transit."
      >
        {byStatus("picked_up").map((o) => (
          <OrderCard key={o.id} o={o} people={people}>
            <form
              action={markDelivered}
              className="mt-3 flex flex-wrap items-center gap-2"
            >
              <input type="hidden" name="order_id" value={o.id} />
              <input
                name="code"
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                placeholder="4-digit code"
                className={`${input} w-32`}
                required
              />
              <button className={`${button} bg-green-600`}>
                Confirm delivery
              </button>
            </form>
            <p className="mt-1 text-xs text-gray-400">
              Enter the code the driver collected from the buyer.
            </p>
          </OrderCard>
        ))}
      </Section>

      <Section
        title="Delivered, awaiting completion"
        count={byStatus("delivered").length}
        empty="No delivered orders waiting."
      >
        {byStatus("delivered").map((o) => (
          <OrderCard key={o.id} o={o} people={people}>
            <p className="mt-2 text-gray-400">
              Delivered:{" "}
              {o.delivered_at ? dateTime(o.delivered_at) : "unknown time"}.
              Complete it once the buyer confirms, or after the 48-hour
              complaint window with no report.
            </p>
            <form action={completeOrder} className="mt-2">
              <input type="hidden" name="order_id" value={o.id} />
              <button className={`${button} bg-green-600`}>
                Complete order (closes the order)
              </button>
            </form>
          </OrderCard>
        ))}
      </Section>

      <Section
        title="Waiting for the farmer to confirm"
        count={byStatus("paid").length}
        empty="No paid orders waiting on farmers."
      >
        {byStatus("paid").map((o) => (
          <OrderCard key={o.id} o={o} people={people} />
        ))}
      </Section>

      <Section
        title="Payouts to make"
        count={pendingPayouts.length}
        empty="No pending payouts."
      >
        {pendingPayouts.map((p) => {
          const farmer = people.get(p.farmer_id);
          const owed = debtByFarmer.get(p.farmer_id) ?? 0;
          return (
            <li key={p.id} className="rounded border border-gray-700 p-3 text-sm">
              <div className="flex items-center justify-between">
                <p className="font-semibold">
                  {p.kind === "pickup" ? "Pickup payment" : "Final payment"} ·
                  Order #{codeOf(p.order_id)}
                </p>
                <p className="text-lg font-bold text-yellow-400">
                  {formatNaira(p.amount)}
                </p>
              </div>
              <p className="mt-1">
                Pay: {personName(farmer)} · Phone: {farmer?.phone ?? "not added yet"}
              </p>
              {owed > 0 && (
                <p className="mt-1 rounded border border-yellow-700 p-2 text-yellow-300">
                  This farmer has {formatNaira(owed)} in open debts. Consider
                  deducting it from this payout.
                </p>
              )}
              <p className="text-xs text-gray-400">
                Get the farmer&apos;s bank details by phone, pay by transfer, then
                record the reference here.
              </p>
              <form
                action={markPayoutPaid}
                className="mt-2 flex flex-wrap items-center gap-2"
              >
                <input type="hidden" name="payout_id" value={p.id} />
                <input
                  name="reference"
                  placeholder="Transfer reference or note"
                  minLength={3}
                  className={`${input} w-64`}
                  required
                />
                <button className={`${button} bg-green-600`}>Mark as paid</button>
              </form>
            </li>
          );
        })}
      </Section>

      <Section
        title="Recently paid payouts"
        count={paidPayouts.length}
        empty="Nothing paid out yet."
      >
        {paidPayouts.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between rounded border border-gray-800 p-3 text-sm"
          >
            <div>
              <p>
                {personName(people.get(p.farmer_id))} · Order #{codeOf(p.order_id)} ·{" "}
                {p.kind}
              </p>
              <p className="text-xs text-gray-400">
                {p.paid_at ? dateTime(p.paid_at) : ""} · Ref: {p.reference}
              </p>
            </div>
            <p className="font-bold text-green-500">{formatNaira(p.amount)}</p>
          </li>
        ))}
      </Section>
    </div>
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-bold">Admin panel</h1>
      <Suspense fallback={<p>Loading...</p>}>
        <AdminContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}