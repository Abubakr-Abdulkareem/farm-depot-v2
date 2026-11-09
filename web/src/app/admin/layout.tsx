import { Suspense } from "react";
import DashboardNav, { type NavItem } from "@/components/DashboardNav";
import { container } from "@/lib/layout";

const items: NavItem[] = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/payouts", label: "Payouts" },
  { href: "/admin/disputes", label: "Disputes" },
  { href: "/admin/support", label: "Support" },
];

export default function AdminLayout({
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