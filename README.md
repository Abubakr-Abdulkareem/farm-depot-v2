# Farm Depot

A B2B marketplace that connects farmers selling produce in bulk with businesses that buy it.

**Live demo:** https://farm-depot-v2.vercel.app

> Payments run in Paystack **test mode**. No real money moves.

## Features

- Register and log in as a **Farmer**, **Buyer** or **Admin**, with role-based dashboards
- Farmers add and delete product listings (price, unit, quantity, minimum order, location)
- Public marketplace with product detail pages
- Buyers place orders, validated in the database (minimum order and stock checks, price read from the product)
- Paystack checkout with server-side verification, a signed webhook, and duplicate-payment detection
- Farmers see paid orders and move them from confirmed to delivered
- Row Level Security on every table

## Tech stack

- **Next.js** (App Router) and **TypeScript**
- **Tailwind CSS**
- **Supabase** (Postgres, Auth, Row Level Security)
- **Paystack** for payments
- Deployed on **Vercel**

## Run it locally

```bash
git clone https://github.com/Abubakr-Abdulkareem/farm-depot-v2.git
cd farm-depot-v2/web
npm install
npm run dev
```

Create `web/.env.local` with:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SECRET_KEY=
PAYSTACK_SECRET_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

You also need a Supabase project with the tables, policies and functions described in `DEVELOPER_GUIDE.md`.

## Roadmap

- Product images
- Search and filters
- Mobile app (React Native with Expo)
- Paying farmers directly through split payments