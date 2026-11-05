import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/format";
import type { Product } from "@/types";

// One padding value for every panel, so spacing is equal everywhere
const panel = "rounded-3xl border border-white/10 p-6 sm:p-8 lg:p-10";

const heroPoints = [
  "Direct from farmers",
  "Checked at pickup",
  "Delivered to your door",
];

const steps = [
  {
    title: "Farmers list produce",
    text: "Post what you have, with your price, quantity and minimum order.",
  },
  {
    title: "Businesses order in bulk",
    text: "Buyers browse, choose a delivery state and pay securely online.",
  },
  {
    title: "We collect and deliver",
    text: "Our driver checks and collects the produce, then delivers it to the buyer.",
  },
  {
    title: "Confirm or report",
    text: "Buyers confirm receipt, or report a problem within 48 hours.",
  },
];

function LeafIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 20C4 11 10 4 20 4c0 10-6 16-16 16Z" />
      <path d="M4 20 14 10" />
    </svg>
  );
}

function ArrowIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function ArrowDownIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 5v14M6 13l6 6 6-6" />
    </svg>
  );
}

function ShieldIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function ClockIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function PromiseCard({
  label,
  title,
  href,
  image,
  position,
}: {
  label: string;
  title: string;
  href: string;
  image: string;
  position: string;
}) {
  return (
    <Link
      href={href}
      className="group relative block aspect-3/4 overflow-hidden rounded-2xl border border-white/10"
    >
      <Image
        src={image}
        alt=""
        fill
        sizes="(min-width: 1024px) 18vw, 50vw"
        className={`object-cover transition duration-500 group-hover:scale-105 ${position}`}
      />
      <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-black/40" />
      <div className="absolute inset-0 flex flex-col justify-between p-4">
        <p className="text-[11px] tracking-widest text-white/80 uppercase">
          {label}
        </p>
        <div className="flex items-end justify-between gap-3">
          <p className="text-base leading-snug font-semibold">{title}</p>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/40 transition group-hover:bg-lime-300 group-hover:text-black">
            <ArrowIcon />
          </span>
        </div>
      </div>
    </Link>
  );
}

async function FreshProducts() {
  await connection();

  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(3);

  const products = (data ?? []) as Product[];

  if (products.length === 0) {
    return (
      <p className="text-center text-white/60">
        New produce appears here as soon as farmers list it.
      </p>
    );
  }

  return (
    <ul className="grid gap-6 sm:grid-cols-3">
      {products.map((p) => (
        <li key={p.id}>
          <Link
            href={`/marketplace/${p.id}`}
            className="block overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition hover:border-lime-300/60"
          >
            <div className="aspect-4/3 w-full bg-white/5">
              {p.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.image_url}
                  alt={p.name}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-white/40">
                  No photo
                </div>
              )}
            </div>
            <div className="p-4">
              <p className="font-semibold">{p.name}</p>
              <p className="mt-1 text-lg font-bold text-lime-300">
                {formatNaira(p.price_per_unit)}
                <span className="text-sm font-normal text-white/60">
                  {" "}
                  / {p.unit}
                </span>
              </p>
              {(p.location || p.origin_state) && (
                <p className="mt-1 text-sm text-white/60">
                  📍 {[p.location, p.origin_state].filter(Boolean).join(", ")}
                </p>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ProductsSkeleton() {
  return (
    <ul className="grid gap-6 sm:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="h-64 animate-pulse rounded-2xl border border-white/10 bg-white/5"
        />
      ))}
    </ul>
  );
}

export default function Home() {
  return (
    <main className="bg-[#07110c] text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
        {/* Hero */}
        <section className="relative isolate overflow-hidden rounded-3xl border border-white/10">
          <Image
            src="/images/hero.jpg"
            alt="Tomato plants in rows at sunrise"
            fill
            priority
            sizes="100vw"
            className="-z-20 object-cover object-[center_40%]"
          />
          <div className="absolute inset-0 -z-10 bg-linear-to-b from-black/60 via-black/30 to-[#07110c]" />

          <div
            style={{ containerType: "inline-size" }}
            className="flex min-h-160 flex-col justify-between gap-6 p-6 sm:p-8 lg:p-10"
          >
            <div className="flex items-center justify-between gap-4">
              <p className="text-[11px] tracking-[0.3em] text-white/70 uppercase sm:text-xs">
                Farm to business marketplace
              </p>
              <Link
                href="/register"
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold whitespace-nowrap text-black transition hover:bg-lime-300"
              >
                Get started →
              </Link>
            </div>

            <h1 className="text-center text-[clamp(2.5rem,15.5cqw,12rem)] leading-none font-extrabold tracking-tight whitespace-nowrap">
              <span className="text-white">FARM</span>
              <span className="text-lime-300">DEPOT</span>
            </h1>

            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div className="max-w-md">
                <p className="text-2xl leading-snug font-semibold">
                  Fresh produce, straight from the farm to your business.
                </p>
                <p className="mt-3 text-sm text-white/70">
                  For farmers and businesses across Nigeria. We handle payment
                  protection, pickup and delivery.
                </p>
                <Link
                  href="/marketplace"
                  className="mt-5 inline-block rounded-full bg-lime-300 px-6 py-3 font-semibold text-black transition hover:bg-lime-200"
                >
                  Browse the marketplace →
                </Link>
              </div>

              <div className="flex flex-col gap-6 lg:items-end">
                <ul className="flex flex-col gap-3 text-xs tracking-widest text-white/80 uppercase lg:items-end">
                  {heroPoints.map((point) => (
                    <li key={point} className="flex items-center gap-3">
                      <span className="h-1.5 w-1.5 rounded-full bg-lime-300 lg:order-2" />
                      {point}
                    </li>
                  ))}
                </ul>
                <a
                  href="#how"
                  className="flex items-center gap-3 text-xs tracking-widest uppercase"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/40">
                    <ArrowDownIcon />
                  </span>
                  How it works
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Promise panel */}
        <section
          className={`${panel} relative bg-linear-to-b from-[#0d1f16] to-[#07110c]`}
        >
          <span className="absolute top-0 left-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-lime-300/40 bg-[#07110c] text-lime-300">
            <LeafIcon className="h-5 w-5" />
          </span>

          <div className="grid grid-cols-2 gap-6 lg:grid-cols-[1fr_1fr_1.4fr_1fr_1fr]">
            <PromiseCard
              label="Marketplace"
              title="Browse fresh produce"
              href="/marketplace"
              image="/images/field-rows.jpg"
              position="object-[center_80%]"
            />
            <PromiseCard
              label="Sell produce"
              title="List your harvest"
              href="/register"
              image="/images/field-mist.jpg"
              position="object-[center_70%]"
            />

            <div className="order-first col-span-2 flex flex-col items-center justify-center gap-4 text-center lg:order-0 lg:col-span-1">
              <p className="text-[11px] tracking-[0.3em] text-lime-300 uppercase">
                Our promise
              </p>
              <h2 className="text-2xl leading-tight font-bold sm:text-3xl">
                Buying and selling in bulk,{" "}
                <span className="text-lime-300">made simple.</span>
              </h2>
              <p className="max-w-xs text-sm text-white/70">
                Farmers list what they have. Businesses order what they need. We
                take care of payment protection, pickup and delivery in between.
              </p>
              <span className="mt-2 flex h-20 w-20 items-center justify-center rounded-full border border-lime-300/40 text-lime-300 shadow-[0_0_40px_rgba(190,242,100,0.25)]">
                <LeafIcon className="h-9 w-9" />
              </span>
            </div>

            <PromiseCard
              label="Delivery"
              title="Pickup and delivery"
              href="#how"
              image="/images/hero.jpg"
              position="object-[center_90%]"
            />
            <PromiseCard
              label="Support"
              title="Help when you need it"
              href="/support"
              image="/images/field-rows.jpg"
              position="object-[center_10%]"
            />
          </div>

          <div className="mt-8 flex flex-col justify-between gap-6 border-t border-white/10 pt-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-lime-300/40 text-lime-300">
                <ShieldIcon />
              </span>
              <div>
                <p className="font-semibold">Secure payments</p>
                <p className="text-sm text-white/60">
                  Pay online through Paystack
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 sm:flex-row-reverse sm:text-right">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-lime-300/40 text-lime-300">
                <ClockIcon />
              </span>
              <div>
                <p className="font-semibold">48-hour protection</p>
                <p className="text-sm text-white/60">
                  Report a problem after delivery
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className={`${panel} scroll-mt-6 bg-white/5`}>
          <p className="text-center text-xs tracking-[0.3em] text-lime-300 uppercase">
            How it works
          </p>
          <h2 className="mt-2 text-center text-3xl font-bold sm:text-4xl">
            From the farm to your door in four steps
          </h2>

          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <li
                key={s.title}
                className="rounded-2xl border border-white/10 bg-black/20 p-5"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-lime-300/50 font-bold text-lime-300">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-white/70">{s.text}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Fresh on the marketplace */}
        <section className={`${panel} bg-white/5`}>
          <div className="mb-8 flex items-end justify-between gap-6">
            <div>
              <p className="text-xs tracking-[0.3em] text-lime-300 uppercase">
                Fresh on the marketplace
              </p>
              <h2 className="mt-2 text-3xl font-bold">Newly listed produce</h2>
            </div>
            <Link
              href="/marketplace"
              className="text-sm font-semibold whitespace-nowrap text-lime-300 hover:underline"
            >
              See everything →
            </Link>
          </div>

          <Suspense fallback={<ProductsSkeleton />}>
            <FreshProducts />
          </Suspense>
        </section>

        {/* Call to action */}
        <section
          className={`${panel} bg-linear-to-br from-lime-300/15 to-transparent text-center`}
        >
          <h2 className="text-3xl font-bold sm:text-4xl">
            Ready to buy or sell in bulk?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-white/70">
            Create a free account as a farmer or a business buyer and start in
            minutes.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Link
              href="/register"
              className="rounded-full bg-lime-300 px-6 py-3 font-semibold text-black transition hover:bg-lime-200"
            >
              Get started
            </Link>
            <Link
              href="/marketplace"
              className="rounded-full border border-white/40 px-6 py-3 font-semibold transition hover:bg-white/10"
            >
              Browse produce
            </Link>
          </div>
        </section>

        <footer className="py-2 text-center text-sm text-white/40">
          Farm Depot, built by Abubakr Abdulkareem
        </footer>
      </div>
    </main>
  );
}