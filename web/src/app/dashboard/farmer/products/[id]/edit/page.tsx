import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";
import { container } from "@/lib/layout";
import ProductForm from "@/components/ProductForm";
import type { Product } from "@/types";

async function EditContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const { user } = await requireRole(["farmer"]);

  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("farmer_id", user.id)
    .maybeSingle();

  if (!data) notFound();

  return (
    <div className="max-w-2xl">
      <ProductForm product={data as Product} />
    </div>
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className={`${container} py-8`}>
      <Link
        href="/dashboard/farmer"
        className="mb-6 inline-block text-sm text-white/60 transition hover:text-white"
      >
        ← Back to your dashboard
      </Link>
      <Suspense fallback={<p className="text-white/60">Loading...</p>}>
        <EditContent params={params} />
      </Suspense>
    </main>
  );
}