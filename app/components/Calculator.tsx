"use client";

import { useEffect, useMemo, useState } from "react";
import { CalcError, calculateCambio, calculateDegage } from "@/lib/calc";
import { defaultDateTimeRange, formatEUR, formatHours } from "@/lib/format";
import { CambioPackageId, DegageCategoryId, PricingData } from "@/lib/types";
import { Field, inputClass, selectClass } from "./Field";

type Provider = "cambio" | "degage" | "both";

const PROVIDER_LABEL: Record<Provider, string> = {
  cambio: "Cambio",
  degage: "Dégage",
  both: "Both",
};

export default function Calculator() {
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [provider, setProvider] = useState<Provider>("both");
  const [packageId, setPackageId] = useState<CambioPackageId>("bonus");
  const [categoryId, setCategoryId] = useState<string>("");
  const [degageCategoryId, setDegageCategoryId] = useState<DegageCategoryId>("A");
  const [{ start, end }, setRange] = useState(defaultDateTimeRange());
  const [km, setKm] = useState<number>(50);

  useEffect(() => {
    fetch("/api/pricing")
      .then((res) => res.json())
      .then((body: { data: PricingData }) => {
        setPricing(body.data);
        setCategoryId((current) => current || body.data.cambio.categories[0]?.id || "");
      })
      .catch(() => setLoadError("Could not load pricing data."));
  }, []);

  const showCambio = provider === "cambio" || provider === "both";
  const showDegage = provider === "degage" || provider === "both";

  const cambioResult = useMemo(() => {
    if (!pricing || !showCambio || !categoryId) return null;
    try {
      return { ok: true as const, value: calculateCambio({ packageId, categoryId, start, end, km }, pricing.cambio) };
    } catch (err) {
      return { ok: false as const, error: err instanceof CalcError ? err.message : "Could not calculate Cambio price." };
    }
  }, [pricing, showCambio, packageId, categoryId, start, end, km]);

  const degageResult = useMemo(() => {
    if (!pricing || !showDegage) return null;
    try {
      return { ok: true as const, value: calculateDegage({ categoryId: degageCategoryId, km }, pricing.degage) };
    } catch (err) {
      return { ok: false as const, error: err instanceof CalcError ? err.message : "Could not calculate Dégage price." };
    }
  }, [pricing, showDegage, degageCategoryId, km]);

  if (loadError) {
    return <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{loadError}</p>;
  }

  if (!pricing) {
    return (
      <div className="flex items-center justify-center py-24 text-neutral-400">
        <span className="animate-pulse text-sm">Loading pricing…</span>
      </div>
    );
  }

  const bothOk = cambioResult?.ok && degageResult?.ok;
  const cambioCheaper = bothOk && cambioResult.value.total < degageResult.value.total;
  const degageCheaper = bothOk && degageResult.value.total < cambioResult.value.total;

  return (
    <div className="flex flex-col gap-6">
      <ProviderToggle provider={provider} onChange={setProvider} />

      <div className="grid gap-4 sm:grid-cols-2">
        {showCambio && (
          <Field label="Cambio package" htmlFor="package">
            <select
              id="package"
              className={selectClass}
              value={packageId}
              onChange={(e) => setPackageId(e.target.value as CambioPackageId)}
            >
              {pricing.cambio.packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.monthlyFee > 0 ? ` (€${p.monthlyFee}/mo)` : " (no subscription)"}
                </option>
              ))}
            </select>
          </Field>
        )}

        {showCambio && (
          <Field label="Car type" htmlFor="category">
            <select id="category" className={selectClass} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {pricing.cambio.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        )}

        {showDegage && (
          <Field label="Dégage category" htmlFor="degage-category">
            <select
              id="degage-category"
              className={selectClass}
              value={degageCategoryId}
              onChange={(e) => setDegageCategoryId(e.target.value as DegageCategoryId)}
            >
              {pricing.degage.categories.map((c) => (
                <option key={c.categoryId} value={c.categoryId}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Start date &amp; time" htmlFor="start">
          <input
            id="start"
            type="datetime-local"
            className={inputClass}
            value={start}
            onChange={(e) => setRange((r) => ({ ...r, start: e.target.value }))}
          />
        </Field>

        <Field label="End date &amp; time" htmlFor="end">
          <input
            id="end"
            type="datetime-local"
            className={inputClass}
            value={end}
            onChange={(e) => setRange((r) => ({ ...r, end: e.target.value }))}
          />
        </Field>

        <Field label="Distance (km)" htmlFor="km">
          <input
            id="km"
            type="number"
            min={0}
            inputMode="decimal"
            className={inputClass}
            value={km}
            onChange={(e) => setKm(Math.max(0, Number(e.target.value)))}
          />
        </Field>
      </div>

      <div className={provider === "both" ? "grid gap-4 sm:grid-cols-2" : "grid gap-4"}>
        {showCambio && cambioResult && (
          <ResultCard
            title="Cambio"
            ok={cambioResult.ok}
            error={!cambioResult.ok ? cambioResult.error : undefined}
            highlight={cambioCheaper}
          >
            {cambioResult.ok && (
              <>
                <PriceLine label="Time" value={formatEUR(cambioResult.value.timeCost)} sub={formatHours(cambioResult.value.billedHours)} />
                <PriceLine
                  label="Distance"
                  value={formatEUR(cambioResult.value.kmCost)}
                  sub={`${km} km @ ${formatEUR(cambioResult.value.effectiveKmRate)}/km avg`}
                />
                <Total value={cambioResult.value.total} />
                {cambioResult.value.weeklyRateApplied && (
                  <p className="text-xs text-neutral-500">Weekly rate applied for full 7-day block(s).</p>
                )}
                <p className="text-xs text-neutral-500">
                  + {formatEUR(cambioResult.value.monthlyFee)}/month subscription
                  {cambioResult.value.activationFee > 0 &&
                    ` + ${formatEUR(cambioResult.value.activationFee)} one-time activation`}{" "}
                  (not included above)
                </p>
              </>
            )}
          </ResultCard>
        )}

        {showDegage && degageResult && (
          <ResultCard
            title="Dégage"
            ok={degageResult.ok}
            error={!degageResult.ok ? degageResult.error : undefined}
            highlight={degageCheaper}
          >
            {degageResult.ok && (
              <>
                <PriceLine
                  label="Distance"
                  value={formatEUR(degageResult.value.total)}
                  sub={`${km} km @ ${formatEUR(degageResult.value.effectiveKmRate)}/km avg`}
                />
                <Total value={degageResult.value.total} />
                <p className="text-xs text-neutral-500">Fuel included, no time-based or subscription fee.</p>
              </>
            )}
          </ResultCard>
        )}
      </div>

      {bothOk && (
        <p className="text-center text-sm text-neutral-600 dark:text-neutral-400">
          {cambioCheaper &&
            `Cambio is ${formatEUR(degageResult!.value.total - cambioResult!.value.total)} cheaper for this trip.`}
          {degageCheaper &&
            `Dégage is ${formatEUR(cambioResult!.value.total - degageResult!.value.total)} cheaper for this trip.`}
          {!cambioCheaper && !degageCheaper && "Both options cost the same for this trip."}
        </p>
      )}

      {(pricing.cambio.needsReview || pricing.degage.needsReview) && (
        <p className="text-center text-xs text-amber-600 dark:text-amber-400">
          Pricing shown is a placeholder pending review — see{" "}
          <a href="/admin" className="underline underline-offset-2">
            /admin
          </a>{" "}
          to fetch and confirm live rates.
        </p>
      )}
    </div>
  );
}

function ProviderToggle({ provider, onChange }: { provider: Provider; onChange: (p: Provider) => void }) {
  return (
    <div className="grid grid-cols-3 gap-1 rounded-2xl bg-neutral-100 p-1 dark:bg-neutral-800">
      {(Object.keys(PROVIDER_LABEL) as Provider[]).map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={`rounded-xl py-2.5 text-sm font-medium transition ${
            provider === p
              ? "bg-white text-neutral-900 shadow dark:bg-neutral-950 dark:text-white"
              : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
          }`}
        >
          {PROVIDER_LABEL[p]}
        </button>
      ))}
    </div>
  );
}

function ResultCard({
  title,
  ok,
  error,
  highlight,
  children,
}: {
  title: string;
  ok: boolean;
  error?: string;
  highlight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 transition ${
        highlight
          ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30"
          : "border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">{title}</h3>
        {highlight && (
          <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-medium text-white">Cheaper</span>
        )}
      </div>
      {ok ? <div className="flex flex-col gap-2">{children}</div> : <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

function PriceLine({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between text-sm">
      <span className="text-neutral-500 dark:text-neutral-400">
        {label} {sub && <span className="text-neutral-400 dark:text-neutral-600">({sub})</span>}
      </span>
      <span className="font-medium text-neutral-800 dark:text-neutral-200">{value}</span>
    </div>
  );
}

function Total({ value }: { value: number }) {
  return (
    <div className="mt-1 flex items-baseline justify-between border-t border-neutral-200 pt-2 dark:border-neutral-800">
      <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300">Total</span>
      <span className="text-2xl font-semibold text-neutral-900 dark:text-white">{formatEUR(value)}</span>
    </div>
  );
}
