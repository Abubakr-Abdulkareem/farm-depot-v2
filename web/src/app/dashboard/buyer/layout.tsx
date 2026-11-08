import { Suspense } from "react";
import DashboardNav, { type NavItem } from "@/components/DashboardNav";
import { container } from "@/lib/layout";

const items: NavItem[] = [
  { href: "/dashboard/buyer", label: "Overview", exact: true },
  { href: "/dashboard/buyer/orders", label: "Orders" },
];

export default function BuyerLayout({
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