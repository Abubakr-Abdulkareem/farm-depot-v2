import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";
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

  return <ProductForm product={data as Product} />;
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="p-6">
      <Link
        href="/dashboard/farmer"
        className="mb-4 inline-block text-sm text-gray-400 underline"
      >
        ← Back to your dashboard
      </Link>
      <Suspense fallback={<p>Loading...</p>}>
        <EditContent params={params} />
      </Suspense>
    </main>
  );
}