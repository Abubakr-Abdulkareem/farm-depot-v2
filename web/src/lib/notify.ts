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

type Note = {
  key: string;
  userId: string;
  kind: string;
  title: string;
  body: string;
  link: string;
  emailText?: string;
  refresh?: boolean;
};

function siteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  return vercel ? `https://${vercel}` : "http://localhost:3000";
}

function compose(...parts: string[]) {
  return ["Hello,", ...parts, "Farm Depot"].join("\n\n");
}

async function emailOf(userId: string) {
  const admin = createAdminClient();
  const { data } = await admin.auth.admin.getUserById(userId);
  return data?.user?.email ?? null;
}

async function adminIds() {
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("id").eq("role", "admin");
  return (data ?? []).map((r) => r.id as string);
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

// Saves the in-app notification (once per key, unless `refresh` is set)
async function saveNotification(n: Note) {
  const admin = createAdminClient();
  const { error } = await admin.from("notifications").upsert(
    {
      user_id: n.userId,
      dedupe_key: n.key,
      kind: n.kind,
      title: n.title,
      body: n.body,
      link: n.link,
      read_at: null,
      created_at: new Date().toISOString(),
    },
    { onConflict: "user_id,dedupe_key", ignoreDuplicates: !n.refresh }
  );
  if (error) console.error("Saving notification failed:", error.message);
}

// In-app notification plus (by default) an email, each sent once
async function deliver(n: Note, withEmail = true) {
  await saveNotification(n);
  if (!withEmail) return;

  await sendOnce(
    `${n.key}:${n.userId}:email`,
    await emailOf(n.userId),
    n.title,
    n.emailText ?? compose(n.body, `Open it: ${siteUrl()}${n.link}`)
  );
}

async function deliverToAdmins(n: Omit<Note, "userId">, withEmail = true) {
  for (const id of await adminIds()) {
    await deliver({ ...n, userId: id }, withEmail);
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
    const key = `order_paid:${order.id}`;

    await deliver({
      key,
      userId: order.buyer_id,
      kind: "order_paid",
      title: `Payment received for order #${code}`,
      body: `We received your payment of ${formatNaira(order.total_amount)} for order #${code}.\n\n${items}\n\nWe will let you know when the farmer confirms and when your order is on its way.`,
      link: "/dashboard/buyer/orders",
    });

    const farmerId = farmerIdOf(order);
    if (farmerId) {
      await deliver({
        key,
        userId: farmerId,
        kind: "order_paid",
        title: `New order #${code}: please confirm`,
        body: `You have a new paid order, #${code}:\n\n${items}\n\nPlease confirm that you can supply it.`,
        link: "/dashboard/farmer/orders",
      });
    }

    await deliverToAdmins({
      key,
      kind: "order_paid",
      title: `Order #${code} was paid`,
      body: `Order #${code} was paid (${formatNaira(order.total_amount)}).\n\n${items}`,
      link: "/admin/orders",
    });
  });
}

export async function notifyOrderConfirmed(orderId: string) {
  await safely("order confirmed", async () => {
    const order = await loadOrder(orderId);
    if (!order) return;

    const code = orderCode(order.id);
    const items = describeItems(order);
    const key = `order_confirmed:${order.id}`;

    await deliverToAdmins({
      key,
      kind: "order_confirmed",
      title: `Order #${code} is ready for pickup`,
      body: `The farmer confirmed order #${code}. It is ready for pickup.\n\n${items}`,
      link: "/admin/orders",
    });

    await deliver(
      {
        key,
        userId: order.buyer_id,
        kind: "order_confirmed",
        title: `The farmer confirmed order #${code}`,
        body: `The farmer confirmed order #${code}. We will collect it and let you know when it is on its way.`,
        link: "/dashboard/buyer/orders",
      },
      false
    );
  });
}

export async function notifyPickedUp(orderId: string) {
  await safely("picked up", async () => {
    const order = await loadOrder(orderId);
    if (!order) return;

    const code = orderCode(order.id);
    await deliver({
      key: `picked_up:${order.id}`,
      userId: order.buyer_id,
      kind: "picked_up",
      title: `Your order #${code} is on its way`,
      body: `Your order #${code} has been collected from the farmer and is on its way to you.\n\nYour delivery code is in your dashboard. Give it to the driver only after you have received and checked your goods.`,
      link: "/dashboard/buyer/orders",
    });
  });
}

export async function notifyDelivered(orderId: string) {
  await safely("delivered", async () => {
    const order = await loadOrder(orderId);
    if (!order) return;

    const code = orderCode(order.id);
    const key = `delivered:${order.id}`;

    await deliver({
      key,
      userId: order.buyer_id,
      kind: "delivered",
      title: `Order #${code} was delivered: please confirm`,
      body: `Order #${code} was marked as delivered.\n\nPlease confirm that you received it, or report a problem. You have 48 hours to report a problem.`,
      link: "/dashboard/buyer/orders",
    });

    const farmerId = farmerIdOf(order);
    if (farmerId) {
      await deliver(
        {
          key,
          userId: farmerId,
          kind: "delivered",
          title: `Order #${code} was delivered`,
          body: `Order #${code} reached the buyer. Thank you!`,
          link: "/dashboard/farmer/orders",
        },
        false
      );
    }
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

    await deliver({
      key: `payout_paid:${p.id}`,
      userId: p.farmer_id as string,
      kind: "payout_paid",
      title: `Payment sent: ${formatNaira(p.amount as number)}`,
      body: `Farm Depot has sent you ${formatNaira(p.amount as number)} for order #${orderCode(p.order_id as string)}.\n\nReference: ${p.reference ?? "none"}`,
      link: "/dashboard/farmer/payments",
    });
  });
}

export async function notifyDisputeOpened(orderId: string) {
  await safely("dispute opened", async () => {
    const order = await loadOrder(orderId);
    if (!order) return;

    const code = orderCode(order.id);
    const key = `dispute_opened:${order.id}`;

    await deliverToAdmins({
      key,
      kind: "dispute_opened",
      title: `Dispute opened on order #${code}`,
      body: `A buyer reported a problem with order #${code}.`,
      link: "/admin/disputes",
    });

    const farmerId = farmerIdOf(order);
    if (farmerId) {
      await deliver({
        key,
        userId: farmerId,
        kind: "dispute_opened",
        title: `A problem was reported on order #${code}`,
        body: `The buyer of order #${code} reported a problem. Farm Depot is reviewing it and will contact you if we need anything from you.`,
        link: "/dashboard/farmer/orders",
      });
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
    const refund = Number(d.refund_amount ?? 0);

    let outcome: string;
    if (d.resolution === "full_refund") {
      outcome = `We approved your report for order #${code}. We will refund ${formatNaira(refund)} to your original payment method.`;
    } else if (d.resolution === "partial_refund") {
      outcome = `We partly approved your report for order #${code}. We will refund ${formatNaira(refund)} to your original payment method.`;
    } else {
      outcome = `We reviewed your report for order #${code} and could not approve a refund. If you disagree, reply through Support.`;
    }

    await deliver({
      key: `dispute_resolved:${d.id}`,
      userId: d.buyer_id as string,
      kind: "dispute_resolved",
      title: `Update on your report for order #${code}`,
      body: outcome,
      link: "/dashboard/buyer/orders",
    });

    if (d.fault === "farmer" && refund > 0) {
      const order = await loadOrder(d.order_id as string);
      const farmerId = order ? farmerIdOf(order) : null;
      if (farmerId) {
        await deliver({
          key: `dispute_resolved:${d.id}`,
          userId: farmerId,
          kind: "dispute_resolved",
          title: `A complaint on order #${code} was upheld`,
          body: `After review, a buyer's complaint about the produce quality on order #${code} was upheld. An amount may be deducted from your next payment.`,
          link: "/dashboard/farmer/payments",
        });
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

    await deliver({
      key: `refund_paid:${r.id}`,
      userId: order.buyer_id as string,
      kind: "refund_paid",
      title: `Your refund of ${formatNaira(r.amount as number)} was sent`,
      body: `We sent your refund of ${formatNaira(r.amount as number)} for order #${orderCode(r.order_id as string)}.\n\nReference: ${r.reference ?? "none"}\n\nIt can take a few days to show up, depending on your bank.`,
      link: "/dashboard/buyer/orders",
    });
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
    const link = `/support/${t.id}`;
    const title = fromAdmin
      ? `Farm Depot replied: ${t.subject}`
      : `New support message: ${t.subject}`;

    // One inbox entry per conversation, refreshed when someone writes again
    const note = {
      key: `support:${t.id}`,
      kind: "support",
      title,
      body: preview,
      link,
      refresh: true,
    };

    const recipients = fromAdmin ? [t.user_id as string] : await adminIds();

    for (const userId of recipients) {
      await saveNotification({ ...note, userId });

      const to = await emailOf(userId);
      if (to) {
        await sendEmail({
          to,
          subject: title,
          text: compose(preview, `Open it: ${siteUrl()}${link}`),
        });
      }
    }
  });
}