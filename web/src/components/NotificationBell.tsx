"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function NotificationBell() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function refresh() {
      const { count: unread } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .is("read_at", null);
      if (active) setCount(unread ?? 0);
    }

    refresh();

    // Live updates when a notification arrives or is marked read
    const channel = supabase
      .channel("notifications-bell")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => {
          refresh();
        }
      )
      .subscribe();

    // Backup check, in case live updates are unavailable
    const interval = setInterval(refresh, 60000);

    return () => {
      active = false;
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <Link
      href="/inbox"
      onClick={() => setCount(0)}
      aria-label={count ? `Inbox, ${count} unread` : "Inbox"}
      className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/25 text-white transition hover:bg-white/10"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path d="M6 9a6 6 0 1 1 12 0c0 6 2 7 2 7H4s2-1 2-7Z" />
        <path d="M10 20a2 2 0 0 0 4 0" />
      </svg>
      {count ? (
        <span className="absolute -top-1 -right-1 min-w-5 rounded-full bg-lime-300 px-1 text-center text-[11px] font-bold text-black">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}