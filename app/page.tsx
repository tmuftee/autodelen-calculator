import Calculator from "./components/Calculator";

export default function Home() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Carshare price calculator</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Compare Cambio and Dégage pricing for your trip in Belgium.
        </p>
      </div>
      <Calculator />
    </div>
  );
}
