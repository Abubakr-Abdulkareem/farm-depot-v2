"use client";

import { useActionState } from "react";
import { postMessage } from "@/app/support/actions";
import { field, noticeBad, primaryButton } from "@/lib/layout";
import type { FormState } from "@/types";

const initialState: FormState = {};

export default function ReplyForm({ threadId }: { threadId: string }) {
  const [state, formAction, pending] = useActionState(
    postMessage,
    initialState
  );

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-3">
      <input type="hidden" name="thread_id" value={threadId} />
      <textarea
        name="body"
        rows={3}
        maxLength={2000}
        placeholder="Write a message..."
        className={`${field} w-full`}
        required
      />
      {state.error && <p className={noticeBad}>{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className={`${primaryButton} w-fit py-2 text-sm`}
      >
        {pending ? "Sending..." : "Send"}
      </button>
    </form>
  );
}