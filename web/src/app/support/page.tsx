import { Suspense } from "react";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { orderCode } from "@/lib/order-code";
import { dateTime } from "@/lib/time";
import { formatDate } from "@/lib/format";
import { badge, card, container, eyebrow } from "@/lib/layout";
import NewThreadForm, { type OrderOption } from "@/components/NewThreadForm";

type Thread = {
  id: string;
  subject: string;
  status: string;
  last_sender_role: string;
  last_message_at: string;
  order_id: string | null;
};

async function SupportContent() {
  const { user, profile } = await requireRole(["buyer", "farmer"]);
  const supabase = await createClient();

  const { data: threadData } = await supabase
    .from("support_threads")
    .select("id, subject, status, last_sender_role, last_message_at, order_id")
    .eq("user_id", user.id)
    .order("last_message_at", { ascending: false });

  const threads = (threadData ?? []) as Thread[];

  let orderOptions: OrderOption[] = [];
  if (profile.role === "buyer") {
    const { data } = await supabase
      .from("orders")
      .select("id, created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    orderOptions = (data ?? []).map((o) => ({
      id: o.id as string,
      label: `Order #${orderCode(o.id as string)} (${formatDate(
        o.created_at as string
      )})`,
    }));
  } else {
    const { data } = await supabase
      .from("farmer_order_items")
      .select("order_id, created_at")
      .neq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(30);
    const seen = new Set<string>();
    for (const o of data ?? []) {
      const id = o.order_id as string;
      if (seen.has(id)) continue;
      seen.add(id);
      orderOptions.push({
        id,
        label: `Order #${orderCode(id)} (${formatDate(o.created_at as string)})`,
      });
    }
  }

  return (
    <div className="grid items-start gap-8 lg:grid-cols-2">
      <NewThreadForm orders={orderOptions} />

      <section>
        <h2 className="mb-3 text-xl font-semibold">
          Your conversations ({threads.length})
        </h2>
        {threads.length === 0 ? (
          <p className="text-white/60">You haven&apos;t contacted us yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {threads.map((t) => {
              const newReply =
                t.status === "open" && t.last_sender_role === "admin";
              return (
                <li key={t.id}>
                  <Link
                    href={`/support/${t.id}`}
                    className={`${card} block transition hover:border-lime-300/60`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold">{t.subject}</p>
                      {newReply ? (
                        <span className={`${badge} bg-lime-300 text-black`}>
                          New reply
                        </span>
                      ) : (
                        <span className={`${badge} bg-white/10 text-white/70`}>
                          {t.status}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-white/60">
                      {t.order_id ? `Order #${orderCode(t.order_id)} · ` : ""}
                      Last message {dateTime(t.last_message_at)}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function Page() {
  return (
    <main className={`${container} py-8`}>
      <p className={eyebrow}>Support</p>
      <h1 className="mt-2 mb-8 text-3xl font-bold sm:text-4xl">
        How can we help?
      </h1>
      <Suspense fallback={<p className="text-white/60">Loading...</p>}>
        <SupportContent />
      </Suspense>
    </main>
  );
}