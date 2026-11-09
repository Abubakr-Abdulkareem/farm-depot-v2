import { formatNaira, formatDate } from "@/lib/format";
import { card } from "@/lib/layout";
import {
  codeOf,
  personName,
  type AdminOrder,
  type Person,
} from "@/lib/admin-data";

export default function AdminOrderCard({
  o,
  people,
  children,
}: {
  o: AdminOrder;
  people: Map<string, Person>;
  children?: React.ReactNode;
}) {
  const first = o.order_items[0];
  const farmerId = first?.products?.farmer_id;
  const farmer = farmerId ? people.get(farmerId) : undefined;
  const buyer = people.get(o.buyer_id);
  const area = [first?.products?.location, first?.products?.origin_state]
    .filter(Boolean)
    .join(", ");

  return (
    <li className={`${card} text-sm`}>
      <div className="flex items-center justify-between">
        <p className="font-semibold">Order #{codeOf(o.id)}</p>
        <p className="text-white/60">{formatDate(o.created_at)}</p>
      </div>

      {o.order_items.map((i, idx) => (
        <p key={idx} className="mt-1">
          {i.products?.name ?? "Product"}: {i.quantity} {i.products?.unit ?? ""} ×{" "}
          {formatNaira(i.unit_price)}
        </p>
      ))}

      <p className="mt-1 text-white/60">
        Produce {formatNaira(o.items_total ?? 0)} + delivery{" "}
        {formatNaira(o.delivery_fee ?? 0)} ={" "}
        <span className="font-bold text-lime-300">
          {formatNaira(o.total_amount)}
        </span>
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-black/20 p-3">
          <p className="font-semibold">Pick up from</p>
          <p>{personName(farmer)}</p>
          <p>Phone: {farmer?.phone ?? "not added yet"}</p>
          <p>Address: {farmer?.location ?? "not added yet"}</p>
          {area && <p className="text-white/60">Listing area: {area}</p>}
        </div>
        <div className="rounded-xl bg-black/20 p-3">
          <p className="font-semibold">Deliver to</p>
          <p>{personName(buyer)}</p>
          <p>Phone: {o.delivery_phone ?? "none"}</p>
          <p>
            Address: {o.delivery_address ?? "none"}
            {o.delivery_state ? `, ${o.delivery_state}` : ""}
          </p>
        </div>
      </div>

      {children}
    </li>
  );
}