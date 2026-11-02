import Link from "next/link";
import { connection } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";

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
    <header className="border-b border-gray-800">
      <nav className="mx-auto flex max-w-6xl items-center justify-between p-4">
        <Link href="/" className="text-xl font-bold text-green-500">
          Farm Depot
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/marketplace">Marketplace</Link>
          {current ? (
            <>
              {dashboard && <Link href={dashboard}>Dashboard</Link>}
              {current.role === "admin" ? (
                <Link href="/admin/support">Support inbox</Link>
              ) : (
                <Link href="/support">Support</Link>
              )}
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login">Log in</Link>
              <Link
                href="/register"
                className="rounded bg-green-600 px-3 py-1 font-semibold text-white"
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