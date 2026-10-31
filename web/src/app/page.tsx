import Link from "next/link";

const steps = [
  {
    title: "Farmers list produce",
    text: "Post what you have, with your price, quantity and minimum order.",
  },
  {
    title: "Businesses place orders",
    text: "Buyers browse the marketplace and order in bulk, paying securely online.",
  },
  {
    title: "Farmers deliver",
    text: "Confirm the order, deliver it, and the buyer sees every status update.",
  },
];

export default function Home() {
  return (
    <main>
      {/* Hero section */}
      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <h1 className="text-4xl font-bold sm:text-5xl">
          Fresh produce, straight from the farm to your business
        </h1>
        <p className="mt-4 text-lg text-gray-400">
          Farm Depot connects farmers selling in bulk with the businesses that
          buy it. No middlemen, clear prices.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            href="/marketplace"
            className="rounded bg-green-600 px-6 py-3 font-semibold text-white"
          >
            Browse the marketplace
          </Link>
          <Link
            href="/register"
            className="rounded border border-gray-600 px-6 py-3 font-semibold"
          >
            Sell your produce
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <h2 className="mb-8 text-center text-2xl font-bold">How it works</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.title} className="rounded border border-gray-700 p-5">
              <p className="text-3xl font-bold text-green-500">{i + 1}</p>
              <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-gray-400">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-gray-800 p-6 text-center text-sm text-gray-500">
        Farm Depot, built by Abubakr Abdulkareem
      </footer>
    </main>
  );
}