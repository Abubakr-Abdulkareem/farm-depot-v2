"use client";

import { useActionState, useState } from "react";
import { openDispute } from "@/app/dashboard/buyer/actions";
import { createClient } from "@/lib/supabase/client";
import { DISPUTE_REASONS } from "@/lib/disputes";
import { field, ghostButton, noticeBad } from "@/lib/layout";
import type { FormState } from "@/types";

const initialState: FormState = {};
const input = `${field} w-full`;

const MAX_PHOTOS = 3;
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function DisputeForm({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);
  const [paths, setPaths] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(
    openDispute,
    initialState
  );

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    setPhotoError(null);
    if (files.length === 0) return;

    if (paths.length + files.length > MAX_PHOTOS) {
      setPhotoError(`You can attach up to ${MAX_PHOTOS} photos.`);
      return;
    }
    for (const f of files) {
      if (!ALLOWED_TYPES.includes(f.type)) {
        setPhotoError("Use JPG, PNG or WebP photos.");
        return;
      }
      if (f.size > MAX_BYTES) {
        setPhotoError("Each photo must be 5 MB or smaller.");
        return;
      }
    }

    setUploading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setPhotoError("Please log in again.");
      setUploading(false);
      return;
    }

    const uploaded: string[] = [];
    for (const file of files) {
      const ext =
        file.type === "image/png"
          ? "png"
          : file.type === "image/webp"
          ? "webp"
          : "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("dispute-evidence")
        .upload(path, file, { contentType: file.type });

      if (error) {
        setPhotoError(error.message);
        break;
      }
      uploaded.push(path);
    }

    setPaths((prev) => [...prev, ...uploaded]);
    setUploading(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 rounded-full border border-red-400/60 px-5 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-950/50"
      >
        Report a problem
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="mt-3 flex flex-col gap-3 rounded-2xl border border-red-500/40 bg-red-950/20 p-4"
    >
      <p className="font-semibold text-red-200">Report a problem</p>
      <p className="text-xs text-white/60">
        You have 48 hours after delivery. Don&apos;t tap &quot;I received my
        goods&quot; if something is wrong.
      </p>

      <input type="hidden" name="order_id" value={orderId} />
      <input type="hidden" name="photo_paths" value={JSON.stringify(paths)} />

      <select name="reason" defaultValue="" className={input} required>
        <option value="" className="text-black">
          What went wrong?
        </option>
        {Object.entries(DISPUTE_REASONS).map(([value, label]) => (
          <option key={value} value={value} className="text-black">
            {label}
          </option>
        ))}
      </select>

      <textarea
        name="details"
        rows={4}
        placeholder="Describe what happened (at least 10 characters)"
        className={input}
        minLength={10}
        maxLength={1000}
        required
      />

      <div>
        <label className="text-sm text-white/60">
          Photos (optional, up to {MAX_PHOTOS}, JPG/PNG/WebP, max 5 MB each)
        </label>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleFiles}
          disabled={uploading || paths.length >= MAX_PHOTOS}
          className="mt-1 block text-sm text-white/70 file:mr-3 file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:py-1.5 file:text-sm file:text-white"
        />
        {uploading && <p className="text-sm text-white/60">Uploading...</p>}
        {photoError && <p className="text-sm text-red-300">{photoError}</p>}
        {paths.length > 0 && (
          <p className="text-sm text-lime-300">
            {paths.length} photo{paths.length === 1 ? "" : "s"} attached
          </p>
        )}
      </div>

      {state.error && <p className={noticeBad}>{state.error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending || uploading}
          className="rounded-full bg-red-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-400 disabled:opacity-50"
        >
          {pending ? "Sending..." : "Submit report"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className={ghostButton}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}