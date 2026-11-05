## Features built
- Auth: register/login with Farmer or Buyer role, role-based dashboard protection
- Farmer: add and delete product listings
- Marketplace: public list of active products

- Buyer: product detail page, place orders (validated in a database function), order history
- Farmer: incoming orders view
- Security: orders are created only via the `place_order` database function; price is read from the product, never from the browser



## Payments (Paystack)
- Buyer clicks Pay now, then redirect to Paystack, then /payment/callback verifies with Paystack's API
- Webhook at /api/paystack/webhook is a backup (signature verified with HMAC-SHA512)
- Orders are marked paid only by the `mark_order_paid` database function (server secret key only)
- Env vars: PAYSTACK_SECRET_KEY, SUPABASE_SECRET_KEY, NEXT_PUBLIC_SITE_URL (server-side secrets, never NEXT_PUBLIC)

- Farmer order flow: paid, then confirmed, then delivered (enforced by the `farmer_update_order_status` database function)

- Product images: uploaded from the browser to the `product-images` Supabase Storage bucket (public read, farmers write only to their own folder); the server validates the URL before saving it

- Marketplace search: name search, category and location filters, price sorting, pagination (12 per page), all driven by URL query parameters

- Anti-bypass: farmer identity shown as an anonymous code, buyer identity hidden from farmers, contact details blocked in listing text

- Delivery: farmers set a pickup state; buyers choose a delivery state, address and phone; the fee comes from the `delivery_zones` table (calculated inside `place_order`) and is added to the Paystack total; each order gets a 4-digit delivery code shown only to the buyer

- Order lifecycle: paid, confirmed (farmer), picked_up and delivered (admin, delivery code), completed (buyer or admin)
- Payouts: 70% at pickup, 30% at completion, tracked in `payouts`; commission (7%, min 1,500, max 30,000) in admin-only `order_financials`; payouts are paid manually and recorded in the admin panel

- Perishability: products have a spoilage level (low/medium/high); `perishability_rules` sets max transit hours per level; `delivery_zones.transit_hours` sets route times; `place_order` rejects routes that are too long for the product

- Disputes: buyers report problems on delivered orders within 48 hours (reason, description, up to 3 photos in the private `dispute-evidence` bucket); admin resolves with a full refund, partial refund or rejection and records whose fault it was

- Refunds are tracked in `refunds` and paid manually from the Paystack dashboard; farmer-fault refunds create a `farmer_debts` record to deduct from future payouts

- Support chat: buyers and farmers message Farm Depot only (never each other); admin inbox at /admin/support; conversations and messages are created through database functions; pages auto-refresh every 10 seconds