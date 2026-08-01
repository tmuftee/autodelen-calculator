"use client";

import { useEffect, useState } from "react";
import { formatEUR } from "@/lib/format";
import { PricingData } from "@/lib/types";

interface AmountMention {
  amount: number;
  context: string;
  unit: string;
}

interface CambioScrape {
  sourceUrl: string;
  fetchedAt: string;
  packagesDetected: string[];
  categoriesDetected: string[];
  hourlyAmounts: AmountMention[];
  kmAmounts: AmountMention[];
  dayAmounts: AmountMention[];
  confidence: string;
  notes: string[];
  error?: string;
}

interface DegageScrape {
  sourceUrl: string;
  fetchedAt: string;
  suggestedCategoryA: number | null;
  suggestedCategoryB: number | null;
  categoryAExcerpts: string[];
  categoryBExcerpts: string[];
  confidence: string;
  notes: string[];
  error?: string;
}

export default function AdminClient() {
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [persisted, setPersisted] = useState(false);
  const [persistenceConfigured, setPersistenceConfigured] = useState(false);
  const [editing, setEditing] = useState<PricingData | null>(null);
  const [scrape, setScrape] = useState<{ cambio: CambioScrape; degage: DegageScrape } | null>(null);
  const [scraping, setScraping] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [savedJson, setSavedJson] = useState<string | null>(null);

  function load() {
    fetch("/api/pricing")
      .then((res) => res.json())
      .then((body: { data: PricingData; persisted: boolean; persistenceConfigured: boolean }) => {
        setPricing(body.data);
        setPersisted(body.persisted);
        setPersistenceConfigured(body.persistenceConfigured);
      });
  }

  useEffect(load, []);

  const draft = editing ?? pricing;
  const isEditing = editing !== null;

  async function fetchLatest() {
    setScraping(true);
    setMessage(null);
    try {
      const res = await fetch("/api/pricing/update", { method: "POST" });
      const body = await res.json();
      setScrape(body);
    } catch {
      setMessage("Failed to fetch live pricing pages.");
    } finally {
      setScraping(false);
    }
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    setMessage(null);
    setSavedJson(null);
    try {
      const toSave: PricingData = { ...draft, lastUpdated: new Date().toISOString() };
      const res = await fetch("/api/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSave),
      });
      if (res.status === 501) {
        setSavedJson(JSON.stringify(toSave, null, 2));
        setMessage("No persistence configured — copy the JSON below into lib/pricing-seed.ts and redeploy.");
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setMessage(body.error ?? "Failed to save pricing.");
        return;
      }
      setMessage("Saved.");
      setEditing(null);
      load();
    } finally {
      setSaving(false);
    }
  }

  function updateCambio(packageId: string, categoryId: string, field: "hourlyRate" | "dayRate" | "kmRate", value: number) {
    if (!editing) return;
    setEditing({
      ...editing,
      cambio: {
        ...editing.cambio,
        packages: editing.cambio.packages.map((p) =>
          p.id === packageId
            ? { ...p, rates: p.rates.map((r) => (r.categoryId === categoryId ? { ...r, [field]: value } : r)) }
            : p
        ),
      },
    });
  }

  function updateMonthlyFee(packageId: string, value: number) {
    if (!editing) return;
    setEditing({
      ...editing,
      cambio: {
        ...editing.cambio,
        packages: editing.cambio.packages.map((p) => (p.id === packageId ? { ...p, monthlyFee: value } : p)),
      },
    });
  }

  function updateDegage(categoryId: "A" | "B", value: number) {
    if (!editing) return;
    setEditing({
      ...editing,
      degage: {
        ...editing.degage,
        categories: editing.degage.categories.map((c) => (c.categoryId === categoryId ? { ...c, pricePerKm: value } : c)),
      },
    });
  }

  if (!draft) return <p className="text-sm text-neutral-400">Loading…</p>;

  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm dark:border-neutral-800 dark:bg-neutral-900">
        <p>
          Persistence: {persistenceConfigured ? "configured (Vercel KV / Upstash)" : "not configured — using bundled seed data"}
          {persisted ? " · showing saved values" : ""}
        </p>
        <p className="mt-1 text-neutral-500">Last updated: {new Date(draft.lastUpdated).toLocaleString("en-GB")}</p>
        {draft.lastAutoCheck && (
          <p className="text-neutral-500">Last automated check: {new Date(draft.lastAutoCheck).toLocaleString("en-GB")}</p>
        )}
        {(draft.cambio.needsReview || draft.degage.needsReview) && (
          <p className="mt-2 font-medium text-amber-600 dark:text-amber-400">
            ⚠ Marked as needing review — fetch and confirm the live numbers below.
          </p>
        )}
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">1. Fetch latest from source</h2>
          <button
            onClick={fetchLatest}
            disabled={scraping}
            className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
          >
            {scraping ? "Fetching…" : "Fetch latest"}
          </button>
        </div>
        <p className="text-xs text-neutral-500">
          Pulls the live pages and extracts candidate numbers as a starting point. This is a best-effort text scan, not a
          guaranteed structured parse — always cross-check against the source links before saving.
        </p>

        {scrape && (
          <div className="flex flex-col gap-4">
            <ScrapePanel
              title="Cambio"
              sourceUrl={scrape.cambio.sourceUrl}
              confidence={scrape.cambio.error ? undefined : scrape.cambio.confidence}
              error={scrape.cambio.error}
              notes={scrape.cambio.notes}
            >
              {!scrape.cambio.error && (
                <div className="flex flex-col gap-1 text-xs text-neutral-600 dark:text-neutral-400">
                  <p>Packages detected: {scrape.cambio.packagesDetected.join(", ") || "none"}</p>
                  <p>Categories detected: {scrape.cambio.categoriesDetected.join(", ") || "none"}</p>
                  <p>Hourly amounts seen: {scrape.cambio.hourlyAmounts.map((a) => a.amount).join(", ") || "none"}</p>
                  <p>Day amounts seen: {scrape.cambio.dayAmounts.map((a) => a.amount).join(", ") || "none"}</p>
                  <p>Km amounts seen: {scrape.cambio.kmAmounts.map((a) => a.amount).join(", ") || "none"}</p>
                </div>
              )}
            </ScrapePanel>

            <ScrapePanel
              title="Dégage"
              sourceUrl={scrape.degage.sourceUrl}
              confidence={scrape.degage.error ? undefined : scrape.degage.confidence}
              error={scrape.degage.error}
              notes={scrape.degage.notes}
            >
              {!scrape.degage.error && (
                <div className="flex flex-col gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                  <p>
                    Suggested category A: {scrape.degage.suggestedCategoryA !== null ? formatEUR(scrape.degage.suggestedCategoryA) : "—"}
                    {isEditing && scrape.degage.suggestedCategoryA !== null && (
                      <button
                        className="ml-2 underline underline-offset-2"
                        onClick={() => updateDegage("A", scrape.degage.suggestedCategoryA!)}
                      >
                        apply
                      </button>
                    )}
                  </p>
                  <p>
                    Suggested category B: {scrape.degage.suggestedCategoryB !== null ? formatEUR(scrape.degage.suggestedCategoryB) : "—"}
                    {isEditing && scrape.degage.suggestedCategoryB !== null && (
                      <button
                        className="ml-2 underline underline-offset-2"
                        onClick={() => updateDegage("B", scrape.degage.suggestedCategoryB!)}
                      >
                        apply
                      </button>
                    )}
                  </p>
                </div>
              )}
            </ScrapePanel>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">2. Review &amp; edit rates</h2>
          {!isEditing ? (
            <button
              onClick={() => setEditing(structuredCloneCompat(pricing!))}
              className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium dark:border-neutral-700"
            >
              Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(null)}
                className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium dark:border-neutral-700"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          )}
        </div>

        {message && <p className="text-sm text-neutral-600 dark:text-neutral-300">{message}</p>}
        {savedJson && (
          <textarea
            readOnly
            className="h-64 w-full rounded-xl border border-neutral-300 bg-neutral-50 p-3 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-900"
            value={savedJson}
          />
        )}

        <p className="text-xs text-neutral-500">
          Source: <a className="underline underline-offset-2" href={draft.cambio.source}>{draft.cambio.source}</a>
        </p>
        {draft.cambio.packages.map((pkg) => (
          <div key={pkg.id} className="overflow-x-auto rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center justify-between bg-neutral-50 px-4 py-2 dark:bg-neutral-900">
              <span className="text-sm font-medium">{pkg.name}</span>
              <label className="flex items-center gap-2 text-xs text-neutral-500">
                Monthly fee (€)
                {isEditing ? (
                  <input
                    type="number"
                    className="w-20 rounded-md border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-950"
                    value={pkg.monthlyFee}
                    onChange={(e) => updateMonthlyFee(pkg.id, Number(e.target.value))}
                  />
                ) : (
                  <span>{formatEUR(pkg.monthlyFee)}</span>
                )}
              </label>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-neutral-500">
                  <th className="px-4 py-2 font-normal">Category</th>
                  <th className="px-4 py-2 font-normal">€/hour</th>
                  <th className="px-4 py-2 font-normal">€/day (cap)</th>
                  <th className="px-4 py-2 font-normal">€/km</th>
                </tr>
              </thead>
              <tbody>
                {pkg.rates.map((rate) => (
                  <tr key={rate.categoryId} className="border-t border-neutral-100 dark:border-neutral-800">
                    <td className="px-4 py-2">{draft.cambio.categories.find((c) => c.id === rate.categoryId)?.name ?? rate.categoryId}</td>
                    {(["hourlyRate", "dayRate", "kmRate"] as const).map((field) => (
                      <td key={field} className="px-4 py-2">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            className="w-20 rounded-md border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-950"
                            value={rate[field]}
                            onChange={(e) => updateCambio(pkg.id, rate.categoryId, field, Number(e.target.value))}
                          />
                        ) : (
                          formatEUR(rate[field])
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        <p className="mt-2 text-xs text-neutral-500">
          Source: <a className="underline underline-offset-2" href={draft.degage.source}>{draft.degage.source}</a>
        </p>
        <div className="overflow-x-auto rounded-2xl border border-neutral-200 dark:border-neutral-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-neutral-500">
                <th className="px-4 py-2 font-normal">Category</th>
                <th className="px-4 py-2 font-normal">€/km</th>
              </tr>
            </thead>
            <tbody>
              {draft.degage.categories.map((c) => (
                <tr key={c.categoryId} className="border-t border-neutral-100 dark:border-neutral-800">
                  <td className="px-4 py-2">{c.name}</td>
                  <td className="px-4 py-2">
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        className="w-20 rounded-md border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-950"
                        value={c.pricePerKm}
                        onChange={(e) => updateDegage(c.categoryId, Number(e.target.value))}
                      />
                    ) : (
                      formatEUR(c.pricePerKm)
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function structuredCloneCompat<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function ScrapePanel({
  title,
  sourceUrl,
  confidence,
  error,
  notes,
  children,
}: {
  title: string;
  sourceUrl: string;
  confidence?: string;
  error?: string;
  notes: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="mb-2 flex items-center justify-between">
        <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium underline underline-offset-2">
          {title}
        </a>
        {confidence && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              confidence === "high"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                : confidence === "medium"
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                  : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
            }`}
          >
            {confidence} confidence
          </span>
        )}
      </div>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : (
        <>
          {children}
          <ul className="mt-2 list-disc pl-4 text-xs text-neutral-400">
            {notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
