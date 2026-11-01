import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/format";
import type { Product } from "@/types";

const CATEGORIES = [
  "Grains",
  "Tubers",
  "Vegetables",
  "Fruits",
  "Livestock",
  "Poultry",
  "Other",
];

const SORTS = {
  newest: "Newest first",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
} as const;

const PAGE_SIZE = 12;

type Filters = {
  q: string;
  category: string;
  location: string;
  sort: string;
  page: number;
};

type RawParams = Record<string, string | string[] | undefined>;

function pick(v: string | string[] | undefined) {
  return ((Array.isArray(v) ? v[0] : v) ?? "").trim();
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

function parseFilters(raw: RawParams): Filters {
  const page = parseInt(pick(raw.page), 10);
  return {
    q: pick(raw.q).slice(0, 60),
    category: pick(raw.category),
    location: pick(raw.location).slice(0, 60),
    sort: pick(raw.sort),
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

function buildHref(f: Filters, page: number) {
  const params = new URLSearchParams();
  if (f.q) params.set("q", f.q);
  if (f.category) params.set("category", f.category);
  if (f.location) params.set("location", f.location);
  if (f.sort) params.set("sort", f.sort);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/marketplace?${qs}` : "/marketplace";
}

async function ProductList({ filters }: { filters: Filters }) {
  await connection();

  const supabase = await createClient();

  let query = supabase
    .from("products")
    .select("*", { count: "exact" })
    .eq("is_active", true);

  if (filters.q) query = query.ilike("name", `%${escapeLike(filters.q)}%`);
  if (filters.category && CATEGORIES.includes(filters.category)) {
    query = query.eq("category", filters.category);
  }
  if (filters.location) {
    query = query.ilike("location", `%${escapeLike(filters.location)}%`);
  }

  if (filters.sort === "price_asc") {
    query = query.order("price_per_unit", { ascending: true });
  } else if (filters.sort === "price_desc") {
    query = query.order("price_per_unit", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const from = (filters.page - 1) * PAGE_SIZE;
  query = query.range(from, from + PAGE_SIZE - 1);

  const { data, error, count } = await query;

  if (error) {
    return (
      <div>
        <p className="text-gray-400">No products on this page.</p>
        {filters.page > 1 && (
          <Link href={buildHref(filters, 1)} className="text-green-500 underline">
            Back to page 1
          </Link>
        )}
      </div>
    );
  }

  const products = (data ?? []) as Product[];
  const total = count ?? products.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (products.length === 0) {
    return <p className="text-gray-400">No products match your search.</p>;
  }

  return (
    <div>
      <p className="mb-3 text-sm text-gray-400">
        {total} product{total === 1 ? "" : "s"} found
      </p>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <li key={p.id}>
            <Link
              href={`/marketplace/${p.id}`}
              className="block overflow-hidden rounded border border-gray-700 hover:border-green-600"
            >
              <div className="aspect-4/3 w-full bg-gray-800">
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.image_url}
                    alt={p.name}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-gray-500">
                    No photo
                  </div>
                )}
              </div>
              <div className="p-4">
                <h2 className="text-lg font-semibold">{p.name}</h2>
                {p.category && (
                  <p className="text-sm text-gray-400">{p.category}</p>
                )}
                <p className="mt-2 text-xl font-bold text-green-500">
                  {formatNaira(p.price_per_unit)}
                  <span className="text-sm font-normal text-gray-400">
                    {" "}
                    / {p.unit}
                  </span>
                </p>
                <p className="mt-1 text-sm">
                  {p.quantity_available} {p.unit} available
                </p>
                <p className="text-sm text-gray-400">
                  Min order: {p.min_order_quantity} {p.unit}
                </p>
                {p.location && (
                  <p className="text-sm text-gray-400">📍 {p.location}</p>
                )}
                <p className="mt-2 text-sm text-gray-400">
                  Seller: Farmer #{p.farmer_id.slice(0, 4).toUpperCase()}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4 text-sm">
          {filters.page > 1 ? (
            <Link
              href={buildHref(filters, filters.page - 1)}
              className="rounded border border-gray-600 px-3 py-1"
            >
              ← Previous
            </Link>
          ) : (
            <span className="rounded border border-gray-800 px-3 py-1 text-gray-600">
              ← Previous
            </span>
          )}
          <span className="text-gray-400">
            Page {filters.page} of {totalPages}
          </span>
          {filters.page < totalPages ? (
            <Link
              href={buildHref(filters, filters.page + 1)}
              className="rounded border border-gray-600 px-3 py-1"
            >
              Next →
            </Link>
          ) : (
            <span className="rounded border border-gray-800 px-3 py-1 text-gray-600">
              Next →
            </span>
          )}
        </div>
      )}
    </div>
  );
}

async function MarketplaceContent({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}) {
  const filters = parseFilters(await searchParams);
  const field = "rounded border border-gray-600 bg-transparent p-2 text-sm";

  return (
    <>
      <form
        method="get"
        action="/marketplace"
        className="mb-6 flex flex-wrap items-end gap-3"
      >
        <input
          name="q"
          defaultValue={filters.q}
          placeholder="Search products (e.g. yam)"
          className={`${field} w-full sm:w-64`}
        />
        <select
          name="category"
          defaultValue={filters.category}
          className={field}
        >
          <option value="" className="text-black">
            All categories
          </option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c} className="text-black">
              {c}
            </option>
          ))}
        </select>
        <input
          name="location"
          defaultValue={filters.location}
          placeholder="Location (e.g. Ogun)"
          className={`${field} w-full sm:w-44`}
        />
        <select name="sort" defaultValue={filters.sort} className={field}>
          {Object.entries(SORTS).map(([value, label]) => (
            <option
              key={value}
              value={value === "newest" ? "" : value}
              className="text-black"
            >
              {label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Search
        </button>
        <Link href="/marketplace" className="py-2 text-sm text-gray-400 underline">
          Clear
        </Link>
      </form>

      <Suspense
        key={JSON.stringify(filters)}
        fallback={<p>Loading products...</p>}
      >
        <ProductList filters={filters} />
      </Suspense>
    </>
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}) {
  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="mb-4 text-2xl font-bold">Marketplace</h1>
      <Suspense fallback={<p>Loading...</p>}>
        <MarketplaceContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}