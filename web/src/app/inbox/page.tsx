import { Suspense } from "react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dateTime } from "@/lib/time";
import { container, eyebrow, pageTitle } from "@/lib/layout";
import AutoRefresh from "@/components/AutoRefresh";
import MarkReadOnOpen from "@/components/MarkReadOnOpen";
import { openNotification } from "./actions";

type Row = {
  id: string;
  kind: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

const kindLabel: Record<string, string> = {
  order_paid: "Payment",
  order_confirmed: "Order",
  picked_up: "Delivery",
  delivered: "Delivery",
  payout_paid: "Payment",
  dispute_opened: "Dispute",
  dispute_resolved: "Dispute",
  refund_paid: "Refund",
  support: "Support",
};

async function InboxContent() {
  await requireRole(["buyer", "farmer", "admin"]);

  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, kind, title, body, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = (data ?? []) as Row[];
  const unreadIds = rows.filter((r) => !r.read_at).map((r) => r.id);

  return (
    <div className="max-w-3xl">
      <AutoRefresh seconds={10} />
      <MarkReadOnOpen ids={unreadIds} />

      <div>
        <p className={eyebrow}>Inbox</p>
        <h1 className={`mt-2 ${pageTitle}`}>Your updates</h1>
        <p className="mt-1 text-sm text-white/60">
          {unreadIds.length > 0
            ? `${unreadIds.length} new`
            : "You're all caught up."}
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="mt-8 text-white/60">
          Nothing here yet. Updates about your orders, deliveries and payments
          will show up here.
        </p>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {rows.map((n) => (
            <li key={n.id}>
              <form action={openNotification}>
                <input type="hidden" name="id" value={n.id} />
                <button
                  className={`block w-full rounded-2xl border p-5 text-left transition hover:border-lime-300/60 ${
                    n.read_at
                      ? "border-white/10 bg-white/5 opacity-70"
                      : "border-lime-300/40 bg-lime-300/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="flex items-center gap-2 font-semibold">
                      {!n.read_at && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-lime-300" />
                      )}
                      {n.title}
                    </p>
                    <span className="text-xs whitespace-nowrap text-white/50">
                      {dateTime(n.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm whitespace-pre-line text-white/70">
                    {n.body}
                  </p>
                  <p className="mt-2 text-xs tracking-widest text-white/40 uppercase">
                    {kindLabel[n.kind] ?? "Update"}
                  </p>
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <main className={`${container} py-8`}>
      <Suspense fallback={<p className="text-white/60">Loading...</p>}>
        <InboxContent />
      </Suspense>
    </main>
  );
}