import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { orderCode } from "@/lib/order-code";
import { dateTime } from "@/lib/time";
import { badge, container, smallButton } from "@/lib/layout";
import ReplyForm from "@/components/ReplyForm";
import AutoRefresh from "@/components/AutoRefresh";
import { closeThread } from "@/app/support/actions";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Message = {
  id: string;
  sender_role: string;
  body: string;
  created_at: string;
};

type Owner = {
  full_name: string | null;
  business_name: string | null;
  role: string;
  phone: string | null;
};

async function ThreadContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const { profile } = await requireRole(["buyer", "farmer", "admin"]);
  const isAdmin = profile.role === "admin";
  const supabase = await createClient();

  const { data: thread } = await supabase
    .from("support_threads")
    .select("id, user_id, order_id, subject, status, created_at")
    .eq("id", id)
    .maybeSingle();

  if (!thread) notFound();

  const { data: messageData } = await supabase
    .from("support_messages")
    .select("id, sender_role, body, created_at")
    .eq("thread_id", id)
    .order("created_at", { ascending: true });

  const messages = (messageData ?? []) as Message[];

  let owner: Owner | null = null;
  if (isAdmin) {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, business_name, role, phone")
      .eq("id", thread.user_id)
      .maybeSingle();
    owner = (data as Owner | null) ?? null;
  }

  const ownerName = owner
    ? owner.business_name || owner.full_name || "User"
    : "User";

  return (
    <div className="max-w-3xl">
      <AutoRefresh seconds={10} />

      <Link
        href={isAdmin ? "/admin/support" : "/support"}
        className="mb-6 inline-block text-sm text-white/60 transition hover:text-white"
      >
        ← Back to {isAdmin ? "the inbox" : "support"}
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{thread.subject}</h1>
          {isAdmin && owner && (
            <p className="mt-1 text-sm text-white/60">
              {ownerName} ({owner.role}) · Phone: {owner.phone ?? "not added"}
            </p>
          )}
          {thread.order_id && (
            <p className="text-sm text-white/60">
              About order #{orderCode(thread.order_id)}
            </p>
          )}
        </div>
        <span className={`${badge} bg-white/10 text-white/70`}>
          {thread.status}
        </span>
      </div>

      <ul className="mt-6 flex flex-col gap-3">
        {messages.map((m) => {
          const mine = isAdmin
            ? m.sender_role === "admin"
            : m.sender_role === "user";
          const label = mine ? "You" : isAdmin ? ownerName : "Farm Depot";
          return (
            <li
              key={m.id}
              className={`max-w-[85%] rounded-2xl p-4 text-sm ${
                mine
                  ? "self-end border border-lime-300/30 bg-lime-300/10"
                  : "self-start border border-white/10 bg-white/10"
              }`}
            >
              <p className="text-xs text-white/50">
                {label} · {dateTime(m.created_at)}
              </p>
              <p className="mt-1 whitespace-pre-wrap">{m.body}</p>
            </li>
          );
        })}
      </ul>

      {thread.status === "closed" && (
        <p className="mt-4 text-sm text-white/60">
          This conversation is closed. Send a message to reopen it.
        </p>
      )}

      <ReplyForm threadId={thread.id} />

      {thread.status === "open" && (
        <form action={closeThread} className="mt-4">
          <input type="hidden" name="thread_id" value={thread.id} />
          <button className={smallButton}>Close conversation</button>
        </form>
      )}
    </div>
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className={`${container} py-8`}>
      <Suspense fallback={<p className="text-white/60">Loading...</p>}>
        <ThreadContent params={params} />
      </Suspense>
    </main>
  );
}