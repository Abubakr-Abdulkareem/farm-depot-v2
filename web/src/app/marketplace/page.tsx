import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";

async function ProductCount() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("products").select("*");

  if (error) {
    return <p className="text-red-600">Error: {error.message}</p>;
  }
  return <p>Connected. Products found: {data.length}</p>;
}

export default function Page() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">marketplace</h1>
      <Suspense fallback={<p>Loading...</p>}>
        <ProductCount />
      </Suspense>
    </main>
  );
}