"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// Marks the notifications on screen as read as soon as the inbox opens
export default function MarkReadOnOpen({ ids }: { ids: string[] }) {
  const key = ids.join(",");

  useEffect(() => {
    if (!key) return;

    async function markRead() {
      const supabase = createClient();
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .in("id", key.split(","))
        .is("read_at", null);

      if (error) console.error("Marking notifications read failed:", error.message);
    }

    markRead();
  }, [key]);

  return null;
}