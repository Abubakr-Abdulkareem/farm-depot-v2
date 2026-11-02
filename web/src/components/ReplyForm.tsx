"use client";

import { useActionState } from "react";
import { postMessage } from "@/app/support/actions";
import type { FormState } from "@/types";

const initialState: FormState = {};

export default function ReplyForm({ threadId }: { threadId: string }) {
  const [state, formAction, pending] = useActionState(
    postMessage,
    initialState
  );

  return (
    <form action={formAction} className="mt-4 flex flex-col gap-2">
      <input type="hidden" name="thread_id" value={threadId} />
      <textarea
        name="body"
        rows={3}
        maxLength={2000}
        placeholder="Write a message..."
        className="w-full rounded border border-gray-600 bg-transparent p-2 text-sm"
        required
      />
      {state.error && <p className="text-sm text-red-500">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Sending..." : "Send"}
      </button>
    </form>
  );
}