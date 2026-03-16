import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";

/**
 * Merge Tailwind classes safely (clsx + tailwind-merge).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format a value stored in cents to a localized currency string.
 * e.g. formatCents(123456) → "$1,234.56"
 */
export function formatCents(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/**
 * Format a margin ratio (0–1 or 0–100) as a percentage string.
 * Handles both decimal (0.234) and percentage (23.4) inputs.
 * e.g. formatMargin(0.234) → "23.4%"  |  formatMargin(23.4) → "23.4%"
 */
export function formatMargin(margin: number): string {
  const value = margin > 1 ? margin : margin * 100;
  return `${value.toFixed(1)}%`;
}

/**
 * Format an ISO date string using date-fns.
 * @param date   ISO date string or Date object
 * @param fmt    date-fns format string (default: "MMM d, yyyy")
 */
export function formatDate(
  date: string | Date,
  fmt = "MMM d, yyyy"
): string {
  try {
    const d = typeof date === "string" ? parseISO(date) : date;
    return format(d, fmt);
  } catch {
    return typeof date === "string" ? date : date.toLocaleDateString();
  }
}

/**
 * Format a plain number with thousands separators.
 * e.g. formatNumber(1234567) → "1,234,567"
 */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

/**
 * Format a change percentage with sign and colour hint.
 * Returns { text: "+12.3%", positive: true }
 */
export function formatChangePct(pct: number): { text: string; positive: boolean } {
  const positive = pct >= 0;
  const text = `${positive ? "+" : ""}${pct.toFixed(1)}%`;
  return { text, positive };
}

/**
 * Compact-format large numbers (e.g. 1_500_000 → "1.5M")
 */
export function formatCompact(n: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}
