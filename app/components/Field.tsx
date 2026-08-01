import { ReactNode } from "react";

export function Field({
  label,
  htmlFor,
  children,
  hint,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-neutral-500 dark:text-neutral-500">{hint}</p>}
    </div>
  );
}

export const inputClass =
  "w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-[15px] text-neutral-900 shadow-sm outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:border-neutral-100 dark:focus:ring-neutral-100/10";

export const selectClass = inputClass + " appearance-none bg-no-repeat";

function roundToStep(value: number, step: number): number {
  const decimals = (String(step).split(".")[1] ?? "").length;
  return Number((Math.round(value / step) * step).toFixed(decimals));
}

/**
 * Number input with explicit up/down stepper buttons - native spinner
 * arrows render inconsistently across browsers/OSes, so this hides them
 * and draws its own instead of relying on that.
 */
export function NumberField({
  id,
  value,
  onChange,
  step = 1,
  min,
  max,
  className = "",
}: {
  id?: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  className?: string;
}) {
  function clamp(v: number): number {
    let result = v;
    if (min !== undefined) result = Math.max(min, result);
    if (max !== undefined) result = Math.min(max, result);
    return result;
  }

  function bump(delta: number) {
    onChange(clamp(roundToStep(value + delta, step)));
  }

  return (
    <div className="relative">
      <input
        id={id}
        type="number"
        inputMode="decimal"
        step={step}
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(n);
        }}
        className={`no-native-spinner pr-8 ${inputClass} ${className}`}
      />
      <div className="absolute inset-y-0 right-1 flex flex-col justify-center">
        <button
          type="button"
          tabIndex={-1}
          aria-label="Increase"
          onClick={() => bump(step)}
          className="flex h-4 w-6 items-center justify-center text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
        >
          <svg viewBox="0 0 10 6" className="h-2 w-2.5 fill-current">
            <path d="M5 0 10 6H0Z" />
          </svg>
        </button>
        <button
          type="button"
          tabIndex={-1}
          aria-label="Decrease"
          onClick={() => bump(-step)}
          className="flex h-4 w-6 items-center justify-center text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
        >
          <svg viewBox="0 0 10 6" className="h-2 w-2.5 fill-current">
            <path d="M5 6 0 0h10Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
