import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/format";
import type { Product } from "@/types";

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

const promises = [
  {
    title: "Secure payments",
    text: "Pay online through Paystack.",
  },
  {
    title: "Checked at pickup",
    text: "Produce is counted and checked before it travels.",
  },
  {
    title: "Support if it goes wrong",
    text: "Report a problem with photos and we review it.",
  },
];

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
    <ul className="grid gap-4 sm:grid-cols-3">
      {products.map((p) => (
        <li key={p.id}>
          <Link
            href={`/marketplace/${p.id}`}
            className="block overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur transition hover:border-lime-300/60"
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
    <ul className="grid gap-4 sm:grid-cols-3">
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
      <div className="mx-auto max-w-6xl px-4 py-6">
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

          <div className="flex min-h-[680px] flex-col justify-between p-6 sm:p-10">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs tracking-[0.3em] text-white/70 uppercase">
                Farm to business marketplace
              </p>
              <Link
                href="/register"
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-lime-300"
              >
                Create an account →
              </Link>
            </div>

            <h1 className="text-center text-[clamp(3.5rem,14vw,9.5rem)] leading-none font-extrabold tracking-tight">
              <span className="text-white">FARM</span>
              <span className="text-lime-300">DEPOT</span>
            </h1>

            <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
              <div className="max-w-md">
                <p className="text-2xl leading-snug font-semibold">
                  Fresh produce, straight from the farm to your business.
                </p>
                <p className="mt-3 text-sm text-white/70">
                  Farmers sell in bulk. Businesses buy with confidence. We handle
                  payment protection, pickup and delivery.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href="/marketplace"
                    className="rounded-full bg-lime-300 px-6 py-3 font-semibold text-black transition hover:bg-lime-200"
                  >
                    Browse the marketplace →
                  </Link>
                  <Link
                    href="/register"
                    className="rounded-full border border-white/40 px-6 py-3 font-semibold transition hover:bg-white/10"
                  >
                    Sell your produce
                  </Link>
                </div>
              </div>

              <ul className="flex flex-col gap-2 text-sm lg:w-72">
                {promises.map((p) => (
                  <li
                    key={p.title}
                    className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 backdrop-blur"
                  >
                    <p className="font-semibold text-lime-300">{p.title}</p>
                    <p className="text-white/70">{p.text}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-16">
          <p className="text-center text-xs tracking-[0.3em] text-lime-300 uppercase">
            How it works
          </p>
          <h2 className="mt-2 text-center text-3xl font-bold sm:text-4xl">
            From the farm to your door in four steps
          </h2>

          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <li
                key={s.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur"
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
        <section className="pb-16">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs tracking-[0.3em] text-lime-300 uppercase">
                Fresh on the marketplace
              </p>
              <h2 className="mt-2 text-3xl font-bold">Newly listed produce</h2>
            </div>
            <Link
              href="/marketplace"
              className="text-sm font-semibold text-lime-300 hover:underline"
            >
              See everything →
            </Link>
          </div>

          <Suspense fallback={<ProductsSkeleton />}>
            <FreshProducts />
          </Suspense>
        </section>

        {/* Call to action */}
        <section className="mb-10 rounded-3xl border border-white/10 bg-linear-to-br from-lime-300/15 to-transparent p-8 text-center sm:p-12">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Ready to buy or sell in bulk?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-white/70">
            Create a free account as a farmer or a business buyer and start in
            minutes.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
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

        <footer className="border-t border-white/10 py-6 text-center text-sm text-white/40">
          Farm Depot, built by Abubakr Abdulkareem
        </footer>
      </div>
    </main>
  );
}