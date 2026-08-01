const currencyFormatter = new Intl.NumberFormat("nl-BE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatEUR(amount: number): string {
  return currencyFormatter.format(amount);
}

export function formatHours(hours: number): string {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  if (wholeHours === 0) return `${minutes} min`;
  if (minutes === 0) return `${wholeHours} h`;
  return `${wholeHours} h ${minutes} min`;
}

/** Default start: next half hour from now. Default end: start + 4 hours. */
export function defaultDateTimeRange(): { start: string; end: string } {
  const now = new Date();
  now.setSeconds(0, 0);
  const minutes = now.getMinutes();
  now.setMinutes(minutes < 30 ? 30 : 0, 0, 0);
  if (minutes >= 30) now.setHours(now.getHours() + 1);

  const start = toLocalInputValue(now);
  const end = toLocalInputValue(new Date(now.getTime() + 4 * 60 * 60 * 1000));
  return { start, end };
}

export function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

/** Adds a duration in minutes to an ISO datetime-local string, returning a new one. */
export function addMinutes(datetimeLocal: string, minutes: number): string {
  const date = new Date(datetimeLocal);
  return toLocalInputValue(new Date(date.getTime() + minutes * 60 * 1000));
}

/** Difference in whole minutes between two datetime-local strings, rounded to the nearest 15. */
export function diffMinutesRoundedToQuarter(startLocal: string, endLocal: string): number {
  const start = new Date(startLocal);
  const end = new Date(endLocal);
  const rawMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
  return Math.max(0, Math.round(rawMinutes / 15) * 15);
}
