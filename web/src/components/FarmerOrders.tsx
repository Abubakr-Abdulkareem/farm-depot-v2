import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { formatNaira, formatDate } from "@/lib/format";

type FarmerOrderItem = {
  id: string;
  status: string;
  created_at: string;
  quantity: number;
  unit: string;
  line_total: number;
  product_name: string;
  buyer_name: string | null;
  buyer_business: string | null;
};

export default async function FarmerOrders() {
  await connection();

  const supabase = await createClient();
  const { data } = await supabase
    .from("farmer_order_items")
    .select("*")
    .order("created_at", { ascending: false });

  const items = (data ?? []) as FarmerOrderItem[];

  return (
    <section>
      <h2 className="mb-3 text-xl font-semibold">
        Incoming orders ({items.length})
      </h2>
      {items.length === 0 ? (
        <p className="text-gray-400">No orders yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((i) => (
            <li key={i.id} className="rounded border border-gray-700 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-400">{formatDate(i.created_at)}</p>
                <span className="rounded bg-gray-800 px-2 py-0.5 text-xs uppercase">
                  {i.status}
                </span>
              </div>
              <p className="mt-1 font-semibold">
                {i.product_name}: {i.quantity} {i.unit}
              </p>
              <p className="text-sm text-gray-400">
                Buyer: {i.buyer_business || i.buyer_name || "Buyer"}
              </p>
              <p className="mt-1 font-bold text-green-500">
                {formatNaira(i.line_total)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}