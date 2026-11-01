import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { formatNaira, formatDate } from "@/lib/format";

type PayoutRow = {
  id: string;
  order_id: string;
  kind: string;
  amount: number;
  status: string;
  created_at: string;
};

export default async function FarmerPayouts() {
  await connection();

  const supabase = await createClient();
  const { data } = await supabase
    .from("payouts")
    .select("id, order_id, kind, amount, status, created_at")
    .order("created_at", { ascending: false });

  const payouts = (data ?? []) as PayoutRow[];

  return (
    <section>
      <h2 className="mb-3 text-xl font-semibold">Your payments</h2>
      {payouts.length === 0 ? (
        <p className="text-gray-400">
          Payments appear here once Farm Depot collects your produce.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {payouts.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded border border-gray-700 p-3"
            >
              <div>
                <p className="font-semibold">
                  {p.kind === "pickup"
                    ? "Pickup payment"
                    : "Final payment"}
                </p>
                <p className="text-sm text-gray-400">
                  Order #{p.order_id.replace(/-/g, "").slice(0, 8).toUpperCase()}{" "}
                  · {formatDate(p.created_at)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-green-500">
                  {formatNaira(p.amount)}
                </p>
                <span
                  className={`rounded px-2 py-0.5 text-xs uppercase ${
                    p.status === "paid"
                      ? "bg-green-900 text-green-300"
                      : "bg-yellow-900 text-yellow-300"
                  }`}
                >
                  {p.status}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}