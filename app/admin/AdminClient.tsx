"use client";

import { useEffect, useState } from "react";
import { formatEUR } from "@/lib/format";
import { KmBracket, PricingData } from "@/lib/types";
import { NumberField } from "../components/Field";

interface ScrapedCambioRate {
  categoryId: string;
  dayHourlyRate: number | null;
  nightHourlyRate: number | null;
  dayRate: number | null;
  weeklyRate: number | null;
  kmUnder100: number | null;
  kmOver100: number | null;
}

interface ScrapedCambioPackage {
  packageId: "start" | "bonus" | "comfort" | null;
  name: string;
  monthlyFee: number | null;
  activationFee: number | null;
  rates: ScrapedCambioRate[];
  complete: boolean;
}

interface CambioScrape {
  sourceUrl: string;
  fetchedAt: string;
  packages: ScrapedCambioPackage[];
  confidence: string;
  notes: string[];
  error?: string;
}

interface DegageCategoryScrape {
  brackets: (KmBracket | null)[];
  excerpt: string | null;
  confidence: string;
}

interface DegageScrape {
  sourceUrl: string;
  fetchedAt: string;
  categoryA: DegageCategoryScrape;
  categoryB: DegageCategoryScrape;
  notes: string[];
  error?: string;
}

const BRACKET_LABELS = ["0-100 km", "100-200 km", "200+ km"];

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

  function updateCambioField(
    packageId: string,
    categoryId: string,
    field: "dayHourlyRate" | "nightHourlyRate" | "dayRate" | "weeklyRate",
    value: number
  ) {
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

  function updateCambioKmBracket(packageId: string, categoryId: string, bracketIndex: number, value: number) {
    if (!editing) return;
    setEditing({
      ...editing,
      cambio: {
        ...editing.cambio,
        packages: editing.cambio.packages.map((p) =>
          p.id === packageId
            ? {
                ...p,
                rates: p.rates.map((r) =>
                  r.categoryId === categoryId
                    ? {
                        ...r,
                        kmBrackets: r.kmBrackets.map((b, i) => (i === bracketIndex ? { ...b, pricePerKm: value } : b)),
                      }
                    : r
                ),
              }
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

  function updateActivationFee(packageId: string, value: number) {
    if (!editing) return;
    setEditing({
      ...editing,
      cambio: {
        ...editing.cambio,
        packages: editing.cambio.packages.map((p) => (p.id === packageId ? { ...p, activationFee: value } : p)),
      },
    });
  }

  function updateDegageKmBracket(categoryId: "A" | "B", bracketIndex: number, value: number) {
    if (!editing) return;
    setEditing({
      ...editing,
      degage: {
        ...editing.degage,
        categories: editing.degage.categories.map((c) =>
          c.categoryId === categoryId
            ? { ...c, kmBrackets: c.kmBrackets.map((b, i) => (i === bracketIndex ? { ...b, pricePerKm: value } : b)) }
            : c
        ),
      },
    });
  }

  function applyDegageBrackets(categoryId: "A" | "B", brackets: (KmBracket | null)[]) {
    if (!editing) return;
    if (brackets.some((b) => b === null)) return;
    setEditing({
      ...editing,
      degage: {
        ...editing.degage,
        categories: editing.degage.categories.map((c) =>
          c.categoryId === categoryId ? { ...c, kmBrackets: brackets as KmBracket[] } : c
        ),
      },
    });
  }

  function applyCambioPackage(scraped: ScrapedCambioPackage) {
    if (!editing || !scraped.complete || !scraped.packageId) return;
    setEditing({
      ...editing,
      cambio: {
        ...editing.cambio,
        packages: editing.cambio.packages.map((p) =>
          p.id === scraped.packageId
            ? {
                ...p,
                monthlyFee: scraped.monthlyFee!,
                activationFee: scraped.activationFee!,
                rates: p.rates.map((r) => {
                  const sr = scraped.rates.find((x) => x.categoryId === r.categoryId);
                  if (!sr) return r;
                  return {
                    ...r,
                    dayHourlyRate: sr.dayHourlyRate!,
                    nightHourlyRate: sr.nightHourlyRate!,
                    dayRate: sr.dayRate!,
                    weeklyRate: sr.weeklyRate!,
                    kmBrackets: [
                      { uptoKm: 100, pricePerKm: sr.kmUnder100! },
                      { uptoKm: null, pricePerKm: sr.kmOver100! },
                    ],
                  };
                }),
              }
            : p
        ),
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
          Pulls the live pages and parses their pricing tables directly. A package/category marked
          &quot;complete&quot; had every field found and can be applied with one click — anything incomplete (or if the
          site&apos;s markup changes) still needs a manual check against the source link.
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
                <div className="flex flex-col gap-3 text-xs text-neutral-600 dark:text-neutral-400">
                  {scrape.cambio.packages.length === 0 && <p>No pricing blocks found.</p>}
                  {scrape.cambio.packages.map((pkg) => (
                    <div key={pkg.name}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{pkg.name}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            pkg.complete
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                          }`}
                        >
                          {pkg.complete ? "complete" : "incomplete"}
                        </span>
                        {isEditing && pkg.complete && (
                          <button className="underline underline-offset-2" onClick={() => applyCambioPackage(pkg)}>
                            apply
                          </button>
                        )}
                      </div>
                      <p>
                        Monthly {pkg.monthlyFee !== null ? formatEUR(pkg.monthlyFee) : "—"} · Activation{" "}
                        {pkg.activationFee !== null ? formatEUR(pkg.activationFee) : "—"}
                      </p>
                      {pkg.rates.map((r) => (
                        <p key={r.categoryId}>
                          {r.categoryId}: day {r.dayHourlyRate ?? "—"}/h, night {r.nightHourlyRate ?? "—"}/h, day cap{" "}
                          {r.dayRate ?? "—"}, week cap {r.weeklyRate ?? "—"}, km ≤100 {r.kmUnder100 ?? "—"}, km 100+{" "}
                          {r.kmOver100 ?? "—"}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </ScrapePanel>

            <ScrapePanel
              title="Dégage"
              sourceUrl={scrape.degage.sourceUrl}
              error={scrape.degage.error}
              notes={scrape.degage.notes}
            >
              {!scrape.degage.error && (
                <div className="flex flex-col gap-3 text-xs text-neutral-600 dark:text-neutral-400">
                  {(["A", "B"] as const).map((cat) => {
                    const catScrape = cat === "A" ? scrape.degage.categoryA : scrape.degage.categoryB;
                    const complete = catScrape.brackets.every((b) => b !== null);
                    return (
                      <div key={cat}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Category {cat}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              catScrape.confidence === "high"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                : catScrape.confidence === "medium"
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                  : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                            }`}
                          >
                            {catScrape.confidence} confidence
                          </span>
                          {isEditing && complete && (
                            <button
                              className="underline underline-offset-2"
                              onClick={() => applyDegageBrackets(cat, catScrape.brackets)}
                            >
                              apply all
                            </button>
                          )}
                        </div>
                        <p>
                          {BRACKET_LABELS.map(
                            (label, i) => `${label}: ${catScrape.brackets[i] ? formatEUR(catScrape.brackets[i]!.pricePerKm) : "—"}`
                          ).join(" · ")}
                        </p>
                      </div>
                    );
                  })}
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
          Source: <a className="underline underline-offset-2" href={draft.cambio.source}>{draft.cambio.source}</a> — hourly
          rate depends on time of day (06:00-24:00 vs 00:00-06:00), the day rate is a cap on a single calendar day, the
          weekly rate is a cap for a full 7-day block, and the km rate drops after 100&nbsp;km.
        </p>
        {draft.cambio.packages.map((pkg) => (
          <div key={pkg.id} className="overflow-x-auto rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-neutral-50 px-4 py-2 dark:bg-neutral-900">
              <span className="text-sm font-medium">{pkg.name}</span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-neutral-500">
                  Monthly fee (€)
                  {isEditing ? (
                    <NumberField
                      className="w-24"
                      step={1}
                      min={0}
                      value={pkg.monthlyFee}
                      onChange={(v) => updateMonthlyFee(pkg.id, v)}
                    />
                  ) : (
                    <span>{formatEUR(pkg.monthlyFee)}</span>
                  )}
                </label>
                <label className="flex items-center gap-2 text-xs text-neutral-500">
                  Activation fee (€)
                  {isEditing ? (
                    <NumberField
                      className="w-24"
                      step={1}
                      min={0}
                      value={pkg.activationFee}
                      onChange={(v) => updateActivationFee(pkg.id, v)}
                    />
                  ) : (
                    <span>{formatEUR(pkg.activationFee)}</span>
                  )}
                </label>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-neutral-500">
                  <th className="px-4 py-2 font-normal">Category</th>
                  <th className="px-4 py-2 font-normal">€/h day</th>
                  <th className="px-4 py-2 font-normal">€/h night</th>
                  <th className="px-4 py-2 font-normal">€/day cap</th>
                  <th className="px-4 py-2 font-normal">€/week cap</th>
                  <th className="px-4 py-2 font-normal">€/km ≤100</th>
                  <th className="px-4 py-2 font-normal">€/km 100+</th>
                </tr>
              </thead>
              <tbody>
                {pkg.rates.map((rate) => (
                  <tr key={rate.categoryId} className="border-t border-neutral-100 dark:border-neutral-800">
                    <td className="px-4 py-2 whitespace-nowrap">
                      {draft.cambio.categories.find((c) => c.id === rate.categoryId)?.name ?? rate.categoryId}
                    </td>
                    {(["dayHourlyRate", "nightHourlyRate", "dayRate", "weeklyRate"] as const).map((field) => (
                      <td key={field} className="px-4 py-2">
                        {isEditing ? (
                          <NumberField
                            className="w-24"
                            step={0.01}
                            min={0}
                            value={rate[field]}
                            onChange={(v) => updateCambioField(pkg.id, rate.categoryId, field, v)}
                          />
                        ) : (
                          formatEUR(rate[field])
                        )}
                      </td>
                    ))}
                    {rate.kmBrackets.map((bracket, i) => (
                      <td key={i} className="px-4 py-2">
                        {isEditing ? (
                          <NumberField
                            className="w-24"
                            step={0.01}
                            min={0}
                            value={bracket.pricePerKm}
                            onChange={(v) => updateCambioKmBracket(pkg.id, rate.categoryId, i, v)}
                          />
                        ) : (
                          formatEUR(bracket.pricePerKm)
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
          Source: <a className="underline underline-offset-2" href={draft.degage.source}>{draft.degage.source}</a> — km
          rate drops at 100&nbsp;km and again at 200&nbsp;km.
        </p>
        <div className="overflow-x-auto rounded-2xl border border-neutral-200 dark:border-neutral-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-neutral-500">
                <th className="px-4 py-2 font-normal">Category</th>
                {BRACKET_LABELS.map((label) => (
                  <th key={label} className="px-4 py-2 font-normal">
                    €/km {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {draft.degage.categories.map((c) => (
                <tr key={c.categoryId} className="border-t border-neutral-100 dark:border-neutral-800">
                  <td className="px-4 py-2">{c.name}</td>
                  {c.kmBrackets.map((bracket, i) => (
                    <td key={i} className="px-4 py-2">
                      {isEditing ? (
                        <NumberField
                          className="w-24"
                          step={0.01}
                          min={0}
                          value={bracket.pricePerKm}
                          onChange={(v) => updateDegageKmBracket(c.categoryId, i, v)}
                        />
                      ) : (
                        formatEUR(bracket.pricePerKm)
                      )}
                    </td>
                  ))}
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
