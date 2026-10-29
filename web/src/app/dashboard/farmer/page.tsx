import { Suspense } from "react";
import { requireRole } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";

async function FarmerContent() {
  const { profile } = await requireRole(["farmer"]);
  return (
    <div className="mt-4 flex flex-col gap-4">
      <p>Welcome, {profile.full_name}</p>
      <div>
        <LogoutButton />
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Farmer dashboard</h1>
      <Suspense fallback={<p>Loading...</p>}>
        <FarmerContent />
      </Suspense>
    </main>
  );
}