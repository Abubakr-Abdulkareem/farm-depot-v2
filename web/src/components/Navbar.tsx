import Link from "next/link";
import { connection } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";
import NotificationBell from "@/components/NotificationBell";
import { container } from "@/lib/layout";

const dashboardFor = {
  farmer: "/dashboard/farmer",
  buyer: "/dashboard/buyer",
  admin: "/admin",
} as const;

export default async function Navbar() {
  await connection();
  const current = await getCurrentUser();
  const dashboard = current?.role ? dashboardFor[current.role] : null;

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07110c]/90 backdrop-blur">
      <nav className={`${container} flex items-center justify-between py-4`}>
        <Link href="/" className="text-xl font-bold text-lime-300">
          Farm Depot
        </Link>
        <div className="flex items-center gap-4 text-sm text-white/80 sm:gap-5">
          <Link href="/marketplace" className="transition hover:text-white">
            Marketplace
          </Link>
          {current ? (
            <>
              {dashboard && (
                <Link href={dashboard} className="transition hover:text-white">
                  Dashboard
                </Link>
              )}
              {current.role === "admin" ? (
                <Link
                  href="/admin/support"
                  className="transition hover:text-white"
                >
                  Support inbox
                </Link>
              ) : (
                <Link href="/support" className="transition hover:text-white">
                  Support
                </Link>
              )}
              <NotificationBell />
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="transition hover:text-white">
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-lime-300 px-4 py-1.5 font-semibold text-black transition hover:bg-lime-200"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}