import { Suspense } from "react";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { orderCode } from "@/lib/order-code";
import { dateTime } from "@/lib/time";
import { card, eyebrow, pageTitle } from "@/lib/layout";
import AutoRefresh from "@/components/AutoRefresh";

type Thread = {
  id: string;
  user_id: string;
  order_id: string | null;
  subject: string;
  status: string;
  last_sender_role: string;
  last_message_at: string;
};

type Person = {
  id: string;
  full_name: string | null;
  business_name: string | null;
  role: string;
};

function ThreadList({
  threads,
  people,
}: {
  threads: Thread[];
  people: Map<string, Person>;
}) {
  return (
    <ul className="grid gap-3 lg:grid-cols-2">
      {threads.map((t) => {
        const p = people.get(t.user_id);
        return (
          <li key={t.id}>
            <Link
              href={`/support/${t.id}`}
              className={`${card} block transition hover:border-lime-300/60`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">{t.subject}</p>
                <span className="text-xs text-white/50 uppercase">
                  {p?.role ?? ""}
                </span>
              </div>
              <p className="mt-1 text-sm text-white/60">
                {p ? p.business_name || p.full_name || "User" : "User"}
                {t.order_id ? ` · Order #${orderCode(t.order_id)}` : ""} · Last
                message {dateTime(t.last_message_at)}
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

async function InboxContent() {
  await requireRole(["admin"]);
  const supabase = await createClient();

  const { data } = await supabase
    .from("support_threads")
    .select(
      "id, user_id, order_id, subject, status, last_sender_role, last_message_at"
    )
    .order("last_message_at", { ascending: false })
    .limit(200);

  const threads = (data ?? []) as Thread[];

  const ids = [...new Set(threads.map((t) => t.user_id))];
  let peopleList: Person[] = [];
  if (ids.length > 0) {
    const { data: ppl } = await supabase
      .from("profiles")
      .select("id, full_name, business_name, role")
      .in("id", ids);
    peopleList = (ppl ?? []) as Person[];
  }
  const people = new Map(peopleList.map((p) => [p.id, p]));

  const needsReply = threads.filter(
    (t) => t.status === "open" && t.last_sender_role === "user"
  );
  const waiting = threads.filter(
    (t) => t.status === "open" && t.last_sender_role === "admin"
  );
  const closed = threads.filter((t) => t.status === "closed");

  return (
    <div className="flex flex-col gap-8">
      <AutoRefresh seconds={15} />

      <section>
        <h2 className="mb-3 text-xl font-semibold text-yellow-300">
          Needs reply ({needsReply.length})
        </h2>
        {needsReply.length === 0 ? (
          <p className="text-white/60">You&apos;re all caught up.</p>
        ) : (
          <ThreadList threads={needsReply} people={people} />
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">
          Waiting for the user ({waiting.length})
        </h2>
        {waiting.length === 0 ? (
          <p className="text-white/60">Nothing waiting.</p>
        ) : (
          <ThreadList threads={waiting} people={people} />
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Closed ({closed.length})</h2>
        {closed.length === 0 ? (
          <p className="text-white/60">No closed conversations.</p>
        ) : (
          <ThreadList threads={closed} people={people} />
        )}
      </section>
    </div>
  );
}

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className={eyebrow}>Support</p>
        <h1 className={`mt-2 ${pageTitle}`}>Support inbox</h1>
      </div>
      <Suspense fallback={<p className="text-white/60">Loading...</p>}>
        <InboxContent />
      </Suspense>
    </div>
  );
}