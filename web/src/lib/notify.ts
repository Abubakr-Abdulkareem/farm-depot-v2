import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { orderCode } from "@/lib/order-code";
import { formatNaira } from "@/lib/format";

type OrderInfo = {
  id: string;
  total_amount: number;
  buyer_id: string;
  order_items: {
    quantity: number;
    unit_price: number;
    products: { name: string; unit: string; farmer_id: string } | null;
  }[];
};

function siteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  return vercel ? `https://${vercel}` : "http://localhost:3000";
}

function adminEmails() {
  return (process.env.ADMIN_NOTIFY_EMAIL ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function compose(...parts: string[]) {
  return ["Hello,", ...parts, "Farm Depot"].join("\n\n");
}

async function emailOf(userId: string) {
  const admin = createAdminClient();
  const { data } = await admin.auth.admin.getUserById(userId);
  return data?.user?.email ?? null;
}

async function safely(label: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (e) {
    console.error(`Notification failed (${label}):`, e);
  }
}

// Sends an email only once per key, even if the trigger runs twice
async function sendOnce(
  key: string,
  to: string | null,
  subject: string,
  text: string
) {
  if (!to) return;

  const admin = createAdminClient();
  const { error } = await admin
    .from("notification_log")
    .insert({ event_key: key });

  if (error) {
    if (error.code !== "23505") {
      console.error("Notification log failed:", error.message);
    }
    return;
  }

  const sent = await sendEmail({ to, subject, text });
  if (!sent) {
    await admin.from("notification_log").delete().eq("event_key", key);
  }
}

async function loadOrder(orderId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("orders")
    .select(
      "id, total_amount, buyer_id, order_items(quantity, unit_price, products(name, unit, farmer_id))"
    )
    .eq("id", orderId)
    .maybeSingle();
  return (data as unknown as OrderInfo | null) ?? null;
}

function describeItems(o: OrderInfo) {
  return o.order_items
    .map(
      (i) =>
        `${i.products?.name ?? "Product"}: ${i.quantity} ${i.products?.unit ?? ""}`.trim()
    )
    .join("\n");
}

function farmerIdOf(o: OrderInfo) {
  return o.order_items.find((i) => i.products)?.products?.farmer_id ?? null;
}

export async function notifyOrderPaid(reference: string) {
  await safely("order paid", async () => {
    const admin = createAdminClient();
    const { data: payment } = await admin
      .from("payments")
      .select("order_id")
      .eq("reference", reference)
      .maybeSingle();
    if (!payment) return;

    const order = await loadOrder(payment.order_id as string);
    if (!order) return;

    const code = orderCode(order.id);
    const items = describeItems(order);
    const site = siteUrl();

    await sendOnce(
      `order_paid:${order.id}:buyer`,
      await emailOf(order.buyer_id),
      `Payment received for order #${code}`,
      compose(
        `We received your payment of ${formatNaira(order.total_amount)} for order #${code}.`,
        items,
        `We will email you when the farmer confirms and when your order is on its way. You can follow it here: ${site}/dashboard/buyer`
      )
    );

    const farmerId = farmerIdOf(order);
    if (farmerId) {
      await sendOnce(
        `order_paid:${order.id}:farmer`,
        await emailOf(farmerId),
        `New order #${code}: please confirm`,
        compose(
          `You have a new paid order, #${code}:`,
          items,
          `Please confirm that you can supply it: ${site}/dashboard/farmer`
        )
      );
    }

    for (const email of adminEmails()) {
      await sendOnce(
        `order_paid:${order.id}:admin:${email}`,
        email,
        `Order #${code} was paid`,
        compose(
          `Order #${code} was paid (${formatNaira(order.total_amount)}).`,
          items,
          `Admin panel: ${site}/admin`
        )
      );
    }
  });
}

export async function notifyOrderConfirmed(orderId: string) {
  await safely("order confirmed", async () => {
    const order = await loadOrder(orderId);
    if (!order) return;

    const code = orderCode(order.id);
    for (const email of adminEmails()) {
      await sendOnce(
        `order_confirmed:${order.id}:admin:${email}`,
        email,
        `Order #${code} is ready for pickup`,
        compose(
          `The farmer confirmed order #${code}. It is ready for pickup.`,
          describeItems(order),
          `Admin panel: ${siteUrl()}/admin`
        )
      );
    }
  });
}

export async function notifyPickedUp(orderId: string) {
  await safely("picked up", async () => {
    const order = await loadOrder(orderId);
    if (!order) return;

    const code = orderCode(order.id);
    await sendOnce(
      `picked_up:${order.id}:buyer`,
      await emailOf(order.buyer_id),
      `Your order #${code} is on its way`,
      compose(
        `Your order #${code} has been collected from the farmer and is on its way to you.`,
        `Your delivery code is in your dashboard. Give it to the driver only after you have received and checked your goods: ${siteUrl()}/dashboard/buyer`
      )
    );
  });
}

export async function notifyDelivered(orderId: string) {
  await safely("delivered", async () => {
    const order = await loadOrder(orderId);
    if (!order) return;

    const code = orderCode(order.id);
    await sendOnce(
      `delivered:${order.id}:buyer`,
      await emailOf(order.buyer_id),
      `Order #${code} was delivered: please confirm`,
      compose(
        `Order #${code} was marked as delivered.`,
        `Please confirm that you received it, or report a problem. You have 48 hours to report a problem: ${siteUrl()}/dashboard/buyer`
      )
    );
  });
}

export async function notifyPayoutPaid(payoutId: string) {
  await safely("payout paid", async () => {
    const admin = createAdminClient();
    const { data: p } = await admin
      .from("payouts")
      .select("id, farmer_id, order_id, amount, reference")
      .eq("id", payoutId)
      .maybeSingle();
    if (!p) return;

    await sendOnce(
      `payout_paid:${p.id}`,
      await emailOf(p.farmer_id as string),
      `Payment sent: ${formatNaira(p.amount as number)}`,
      compose(
        `Farm Depot has sent you ${formatNaira(p.amount as number)} for order #${orderCode(p.order_id as string)}.`,
        `Reference: ${p.reference ?? "none"}`,
        `You can see all your payments here: ${siteUrl()}/dashboard/farmer`
      )
    );
  });
}

export async function notifyDisputeOpened(orderId: string) {
  await safely("dispute opened", async () => {
    const order = await loadOrder(orderId);
    if (!order) return;

    const code = orderCode(order.id);
    const site = siteUrl();

    for (const email of adminEmails()) {
      await sendOnce(
        `dispute_opened:${order.id}:admin:${email}`,
        email,
        `Dispute opened on order #${code}`,
        compose(
          `A buyer reported a problem with order #${code}.`,
          `Review it here: ${site}/admin`
        )
      );
    }

    const farmerId = farmerIdOf(order);
    if (farmerId) {
      await sendOnce(
        `dispute_opened:${order.id}:farmer`,
        await emailOf(farmerId),
        `A problem was reported on order #${code}`,
        compose(
          `The buyer of order #${code} reported a problem. Farm Depot is reviewing it and will contact you if we need anything from you.`,
          `${site}/dashboard/farmer`
        )
      );
    }
  });
}

export async function notifyDisputeResolved(disputeId: string) {
  await safely("dispute resolved", async () => {
    const admin = createAdminClient();
    const { data: d } = await admin
      .from("disputes")
      .select("id, order_id, buyer_id, resolution, refund_amount, fault")
      .eq("id", disputeId)
      .maybeSingle();
    if (!d) return;

    const code = orderCode(d.order_id as string);
    const site = siteUrl();
    const refund = Number(d.refund_amount ?? 0);

    let outcome: string;
    if (d.resolution === "full_refund") {
      outcome = `We approved your report for order #${code}. We will refund ${formatNaira(refund)} to your original payment method.`;
    } else if (d.resolution === "partial_refund") {
      outcome = `We partly approved your report for order #${code}. We will refund ${formatNaira(refund)} to your original payment method.`;
    } else {
      outcome = `We reviewed your report for order #${code} and could not approve a refund. If you disagree, reply through Support: ${site}/support`;
    }

    await sendOnce(
      `dispute_resolved:${d.id}:buyer`,
      await emailOf(d.buyer_id as string),
      `Update on your report for order #${code}`,
      compose(outcome, `${site}/dashboard/buyer`)
    );

    if (d.fault === "farmer" && refund > 0) {
      const order = await loadOrder(d.order_id as string);
      const farmerId = order ? farmerIdOf(order) : null;
      if (farmerId) {
        await sendOnce(
          `dispute_resolved:${d.id}:farmer`,
          await emailOf(farmerId),
          `A complaint on order #${code} was upheld`,
          compose(
            `After review, a buyer's complaint about the produce quality on order #${code} was upheld. An amount may be deducted from your next payment.`,
            `Details: ${site}/dashboard/farmer`
          )
        );
      }
    }
  });
}

export async function notifyRefundPaid(refundId: string) {
  await safely("refund paid", async () => {
    const admin = createAdminClient();
    const { data: r } = await admin
      .from("refunds")
      .select("id, order_id, amount, reference")
      .eq("id", refundId)
      .maybeSingle();
    if (!r) return;

    const { data: order } = await admin
      .from("orders")
      .select("buyer_id")
      .eq("id", r.order_id as string)
      .maybeSingle();
    if (!order) return;

    await sendOnce(
      `refund_paid:${r.id}`,
      await emailOf(order.buyer_id as string),
      `Your refund of ${formatNaira(r.amount as number)} was sent`,
      compose(
        `We sent your refund of ${formatNaira(r.amount as number)} for order #${orderCode(r.order_id as string)}.`,
        `Reference: ${r.reference ?? "none"}`,
        `It can take a few days to show up, depending on your bank.`
      )
    );
  });
}

export async function notifySupportMessage(
  threadId: string,
  fromAdmin: boolean,
  body: string
) {
  await safely("support message", async () => {
    const admin = createAdminClient();
    const { data: t } = await admin
      .from("support_threads")
      .select("id, user_id, subject")
      .eq("id", threadId)
      .maybeSingle();
    if (!t) return;

    const preview = body.length > 300 ? `${body.slice(0, 300)}...` : body;
    const link = `${siteUrl()}/support/${t.id}`;

    if (fromAdmin) {
      const to = await emailOf(t.user_id as string);
      if (!to) return;
      await sendEmail({
        to,
        subject: `Farm Depot replied: ${t.subject}`,
        text: compose(`Farm Depot replied to your conversation "${t.subject}":`, preview, `Read and reply: ${link}`),
      });
    } else {
      for (const email of adminEmails()) {
        await sendEmail({
          to: email,
          subject: `New support message: ${t.subject}`,
          text: compose(`A user wrote in "${t.subject}":`, preview, `Open it: ${link}`),
        });
      }
    }
  });
}