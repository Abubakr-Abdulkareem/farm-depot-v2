import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { formatNaira, formatDate } from "@/lib/format";
import { badge, card, noticeBad } from "@/lib/layout";

type PayoutRow = {
  id: string;
  order_id: string;
  kind: string;
  amount: number;
  status: string;
  created_at: string;
};

type DebtRow = {
  id: string;
  amount: number;
  created_at: string;
};

export default async function FarmerPayouts() {
  await connection();

  const supabase = await createClient();
  const [{ data }, { data: debtData }] = await Promise.all([
    supabase
      .from("payouts")
      .select("id, order_id, kind, amount, status, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("farmer_debts")
      .select("id, amount, created_at")
      .eq("status", "open")
      .order("created_at", { ascending: false }),
  ]);

  const payouts = (data ?? []) as PayoutRow[];
  const debts = (debtData ?? []) as DebtRow[];

  return (
    <section>
      <h2 className="mb-3 text-xl font-semibold">Your payments</h2>

      {debts.length > 0 && (
        <div className={`${noticeBad} mb-4 text-sm`}>
          <p className="font-semibold">
            Amount to be deducted from your payments
          </p>
          {debts.map((d) => (
            <p key={d.id}>
              {formatNaira(d.amount)} · {formatDate(d.created_at)} · after a
              buyer&apos;s complaint about the produce quality
            </p>
          ))}
        </div>
      )}

      {payouts.length === 0 ? (
        <p className="text-white/60">
          Payments appear here once Farm Depot collects your produce.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {payouts.map((p) => (
            <li
              key={p.id}
              className={`${card} flex items-center justify-between gap-3`}
            >
              <div>
                <p className="font-semibold">
                  {p.kind === "pickup" ? "Pickup payment" : "Final payment"}
                </p>
                <p className="text-sm text-white/60">
                  Order #{p.order_id.replace(/-/g, "").slice(0, 8).toUpperCase()}{" "}
                  · {formatDate(p.created_at)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-lime-300">
                  {formatNaira(p.amount)}
                </p>
                <span
                  className={`${badge} ${
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