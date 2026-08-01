import AdminClient from "./AdminClient";

export default function AdminPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pricing admin</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Review current rates, pull the latest numbers from cambio.be / degage.be, and save.
        </p>
      </div>
      <AdminClient />
    </div>
  );
}
