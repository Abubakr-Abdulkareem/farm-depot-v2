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