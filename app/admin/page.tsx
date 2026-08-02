import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/admin-auth";
import AdminClient from "./AdminClient";
import LoginForm from "./LoginForm";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const cookieStore = await cookies();
  const authorized = await verifyAdminToken(cookieStore.get(ADMIN_COOKIE)?.value);

  if (!authorized) {
    const { error } = await searchParams;
    return <LoginForm error={error === "disabled" ? "disabled" : error ? "wrong" : undefined} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pricing admin</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Review current rates, pull the latest numbers from cambio.be / degage.be, and save.
          </p>
        </div>
        <form action="/api/admin/logout" method="POST">
          <button type="submit" className="whitespace-nowrap text-xs text-neutral-500 underline underline-offset-2 hover:text-neutral-800 dark:hover:text-neutral-200">
            Log out
          </button>
        </form>
      </div>
      <AdminClient />
    </div>
  );
}
