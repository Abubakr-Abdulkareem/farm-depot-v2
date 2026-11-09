import type { createClient } from "@/lib/supabase/server";

type Db = Awaited<ReturnType<typeof createClient>>;

export type OrderItem = {
  quantity: number;
  unit_price: number;
  products: {
    name: string;
    unit: string;
    farmer_id: string;
    origin_state: string | null;
    location: string | null;
  } | null;
};

export type AdminOrder = {
  id: string;
  status: string;
  total_amount: number;
  items_total: number | null;
  delivery_fee: number | null;
  delivery_state: string | null;
  delivery_address: string | null;
  delivery_phone: string | null;
  created_at: string;
  delivered_at: string | null;
  buyer_id: string;
  order_items: OrderItem[];
};

export type Person = {
  id: string;
  full_name: string | null;
  business_name: string | null;
  phone: string | null;
  location: string | null;
};

export type Payout = {
  id: string;
  order_id: string;
  farmer_id: string;
  kind: string;
  amount: number;
  status: string;
  reference: string | null;
  paid_at: string | null;
  created_at: string;
};

export type Dispute = {
  id: string;
  order_id: string;
  buyer_id: string;
  reason: string;
  details: string;
  photo_paths: string[] | null;
  status: string;
  created_at: string;
};

export type Refund = {
  id: string;
  order_id: string;
  amount: number;
  status: string;
  reference: string | null;
  paid_at: string | null;
  created_at: string;
};

export type Debt = {
  id: string;
  farmer_id: string;
  dispute_id: string;
  amount: number;
  status: string;
  created_at: string;
};

export const ORDER_SELECT =
  "id, status, total_amount, items_total, delivery_fee, delivery_state, delivery_address, delivery_phone, created_at, delivered_at, buyer_id, order_items(quantity, unit_price, products(name, unit, farmer_id, origin_state, location))";

export const codeOf = (id: string) =>
  id.replace(/-/g, "").slice(0, 8).toUpperCase();

export const personName = (p?: Person) =>
  p ? p.business_name || p.full_name || "Unnamed" : "Unknown";

export function peopleIdsFromOrders(orders: AdminOrder[]) {
  const ids = new Set<string>();
  orders.forEach((o) => {
    ids.add(o.buyer_id);
    o.order_items.forEach((i) => {
      if (i.products) ids.add(i.products.farmer_id);
    });
  });
  return ids;
}

export async function loadPeople(supabase: Db, ids: Iterable<string>) {
  const list = [...new Set(ids)];
  if (list.length === 0) return new Map<string, Person>();

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, business_name, phone, location")
    .in("id", list);

  return new Map(((data ?? []) as Person[]).map((p) => [p.id, p]));
}