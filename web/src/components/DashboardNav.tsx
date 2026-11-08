"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = {
  href: string;
  label: string;
  exact?: boolean;
  also?: string[];
};

export default function DashboardNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  function isActive(item: NavItem) {
    if (item.exact) return pathname === item.href;
    const prefixes = [item.href, ...(item.also ?? [])];
    return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  }

  return (
    <nav className="mb-8 flex gap-2 overflow-x-auto border-b border-white/10 pb-3">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`rounded-full px-4 py-1.5 text-sm whitespace-nowrap transition ${
            isActive(item)
              ? "bg-lime-300 font-semibold text-black"
              : "text-white/70 hover:bg-white/10 hover:text-white"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}