import { Suspense } from "react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dateTime } from "@/lib/time";
import { eyebrow, field, noticeBad, pageTitle } from "@/lib/layout";
import {
  ORDER_SELECT,
  loadPeople,
  peopleIdsFromOrders,
  type AdminOrder,
} from "@/lib/admin-data";
import AdminSection from "@/components/AdminSection";
import AdminOrderCard from "@/components/AdminOrderCard";
import { markPickedUp, markDelivered, completeOrder } from "../actions";

const button = "rounded-full px-5 py-2 text-sm font-semibold text-white transition";

async function OrdersContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireRole(["admin"]);
  const { error: actionError } = await searchParams;

  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .in("status", ["paid", "confirmed", "picked_up", "delivered"])
    .order("created_at", { ascending: true });

  const orders = (data ?? []) as unknown as AdminOrder[];
  const people = await loadPeople(supabase, peopleIdsFromOrders(orders));
  const byStatus = (s: string) => orders.filter((o) => o.status === s);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className={eyebrow}>Orders</p>
        <h1 className={`mt-2 ${pageTitle}`}>Orders in progress</h1>
      </div>

      {actionError && <p className={noticeBad}>{actionError}</p>}

      <AdminSection
        title="Ready for pickup"
        count={byStatus("confirmed").length}
        empty="No confirmed orders waiting for pickup."
      >
        {byStatus("confirmed").map((o) => (
          <AdminOrderCard key={o.id} o={o} people={people}>
            <form action={markPickedUp} className="mt-3">
              <input type="hidden" name="order_id" value={o.id} />
              <button className={`${button} bg-blue-600 hover:bg-blue-500`}>
                Mark as picked up (pays the farmer in full)
              </button>
              <p className="mt-1 text-xs text-white/50">
                Only after the driver has counted and checked the goods.
              </p>
            </form>
          </AdminOrderCard>
        ))}
      </AdminSection>

      <AdminSection
        title="In transit"
        count={byStatus("picked_up").length}
        empty="Nothing in transit."
      >
        {byStatus("picked_up").map((o) => (
          <AdminOrderCard key={o.id} o={o} people={people}>
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
                className={`${field} w-32`}
                required
              />
              <button className={`${button} bg-green-600 hover:bg-green-500`}>
                Confirm delivery
              </button>
            </form>
            <p className="mt-1 text-xs text-white/50">
              Enter the code the driver collected from the buyer.
            </p>
          </AdminOrderCard>
        ))}
      </AdminSection>

      <AdminSection
        title="Delivered, awaiting completion"
        count={byStatus("delivered").length}
        empty="No delivered orders waiting."
      >
        {byStatus("delivered").map((o) => (
          <AdminOrderCard key={o.id} o={o} people={people}>
            <p className="mt-3 text-white/60">
              Delivered:{" "}
              {o.delivered_at ? dateTime(o.delivered_at) : "unknown time"}.
              Complete it once the buyer confirms, or after the 48-hour
              complaint window with no report.
            </p>
            <form action={completeOrder} className="mt-2">
              <input type="hidden" name="order_id" value={o.id} />
              <button className={`${button} bg-green-600 hover:bg-green-500`}>
                Complete order (closes the order)
              </button>
            </form>
          </AdminOrderCard>
        ))}
      </AdminSection>

      <AdminSection
        title="Waiting for the farmer to confirm"
        count={byStatus("paid").length}
        empty="No paid orders waiting on farmers."
      >
        {byStatus("paid").map((o) => (
          <AdminOrderCard key={o.id} o={o} people={people} />
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
      <OrdersContent searchParams={searchParams} />
    </Suspense>
  );
}