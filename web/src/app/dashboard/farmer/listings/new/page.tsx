import { Suspense } from "react";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import ProductForm from "@/components/ProductForm";

async function NewContent() {
  await requireRole(["farmer"]);
  return (
    <div className="max-w-2xl">
      <ProductForm />
    </div>
  );
}

export default function Page() {
  return (
    <div>
      <Link
        href="/dashboard/farmer/listings"
        className="mb-6 inline-block text-sm text-white/60 transition hover:text-white"
      >
        ← Back to your listings
      </Link>
      <Suspense fallback={<p className="text-white/60">Loading...</p>}>
        <NewContent />
      </Suspense>
    </div>
  );
}