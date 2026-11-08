import { Suspense } from "react";
import DashboardNav, { type NavItem } from "@/components/DashboardNav";
import { container } from "@/lib/layout";

const items: NavItem[] = [
  { href: "/dashboard/farmer", label: "Overview", exact: true },
  {
    href: "/dashboard/farmer/listings",
    label: "Listings",
    also: ["/dashboard/farmer/products"],
  },
  { href: "/dashboard/farmer/orders", label: "Orders" },
  { href: "/dashboard/farmer/payments", label: "Payments" },
  { href: "/dashboard/farmer/profile", label: "Pickup details" },
];

export default function FarmerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className={`${container} py-8`}>
      <Suspense fallback={<div className="mb-8 h-12 border-b border-white/10" />}>
        <DashboardNav items={items} />
      </Suspense>
      {children}
    </main>
  );
}