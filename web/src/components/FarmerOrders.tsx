import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { formatNaira, formatDate } from "@/lib/format";
import { updateOrderStatus } from "@/app/dashboard/farmer/actions";

type FarmerOrderItem = {
  id: string;
  order_id: string;
  order_code: string;
  status: string;
  created_at: string;
  quantity: number;
  unit: string;
  line_total: number;
  product_name: string;
};

const statusStyle: Record<string, string> = {
  paid: "bg-yellow-900 text-yellow-300",
  confirmed: "bg-blue-900 text-blue-300",
  picked_up: "bg-purple-900 text-purple-300",
  delivered: "bg-green-900 text-green-300",
  completed: "bg-green-900 text-green-300",
};

const statusNote: Record<string, string> = {
  paid: "Confirm that you can supply this order.",
  confirmed: "Farm Depot will collect it from you. Keep it ready.",
    picked_up: "Collected. Your payment is being processed.",
  delivered: "Delivered. Thank you!",
  completed: "Complete. Thank you!",
};

export default async function FarmerOrders() {
  await connection();

  const supabase = await createClient();
  const { data } = await supabase
    .from("farmer_order_items")
    .select("*")
    .neq("status", "pending")
    .order("created_at", { ascending: false });

  const items = (data ?? []) as FarmerOrderItem[];

  return (
    <section>
      <h2 className="mb-3 text-xl font-semibold">
        Incoming orders ({items.length})
      </h2>
      {items.length === 0 ? (
        <p className="text-gray-400">No paid orders yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((i) => (
            <li key={i.id} className="rounded border border-gray-700 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-400">
                  Order #{i.order_code} · {formatDate(i.created_at)}
                </p>
                <span
                  className={`rounded px-2 py-0.5 text-xs uppercase ${
                    statusStyle[i.status] ?? "bg-gray-800"
                  }`}
                >
                  {i.status.replace("_", " ")}
                </span>
              </div>
              <p className="mt-1 font-semibold">
                {i.product_name}: {i.quantity} {i.unit}
              </p>
              <p className="mt-1 font-bold text-green-500">
                {formatNaira(i.line_total)}
              </p>
              {statusNote[i.status] && (
                <p className="mt-1 text-sm text-gray-400">
                  {statusNote[i.status]}
                </p>
              )}

              {i.status === "paid" && (
                <form action={updateOrderStatus} className="mt-3">
                  <input type="hidden" name="order_id" value={i.order_id} />
                  <input type="hidden" name="status" value="confirmed" />
                  <button className="rounded bg-blue-600 px-4 py-2 font-semibold text-white">
                    Confirm order
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}