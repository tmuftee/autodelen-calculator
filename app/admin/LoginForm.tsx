import { inputClass } from "../components/Field";

export default function LoginForm({ error }: { error?: "wrong" | "disabled" }) {
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pricing admin</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Enter the admin password to continue.</p>
      </div>

      {error === "wrong" && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          Incorrect password.
        </p>
      )}
      {error === "disabled" && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          Admin access is disabled: set the ADMIN_PASSWORD environment variable to enable it.
        </p>
      )}

      <form action="/api/admin/login" method="POST" className="flex flex-col gap-3">
        <input
          type="password"
          name="password"
          autoFocus
          required
          placeholder="Password"
          className={inputClass}
        />
        <button
          type="submit"
          className="rounded-full bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
        >
          Log in
        </button>
      </form>
    </div>
  );
}
