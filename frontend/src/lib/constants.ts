import type { OrderStatus } from "@/types/api";
import type { GranularityOption, DateRangePreset } from "@/types/analytics";

// ─── Cost Layer Labels ────────────────────────────────────────────────────────

export const COST_LAYER_LABELS: Record<string, string> = {
  supplier_cost_cents: "Supplier Cost",
  platform_fee_cents: "Platform Fee",
  payment_fee_cents: "Payment Fee",
  shipping_cost_cents: "Shipping Cost",
  return_cost_cents: "Return Cost",
  ad_spend_cents: "Ad Spend",
  customs_duty_cents: "Customs & Duties",
  other_cost_cents: "Other Costs",
};

export const COST_LAYER_COLORS: Record<string, string> = {
  supplier_cost_cents: "#6366f1",   // indigo
  platform_fee_cents: "#8b5cf6",    // violet
  payment_fee_cents: "#a78bfa",     // purple-light
  shipping_cost_cents: "#f59e0b",   // amber
  return_cost_cents: "#ef4444",     // red
  ad_spend_cents: "#10b981",        // emerald
  customs_duty_cents: "#3b82f6",    // blue
  other_cost_cents: "#94a3b8",      // slate
};

// ─── Order Status ─────────────────────────────────────────────────────────────

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  paid: "Paid",
  fulfilled: "Fulfilled",
  refunded: "Refunded",
  cancelled: "Cancelled",
};

export const ORDER_STATUS_COLORS: Record<
  OrderStatus,
  "success" | "warning" | "danger" | "neutral" | "info"
> = {
  pending: "warning",
  paid: "info",
  fulfilled: "success",
  refunded: "neutral",
  cancelled: "danger",
};

// ─── Granularity ─────────────────────────────────────────────────────────────

export const GRANULARITY_OPTIONS: GranularityOption[] = [
  { value: "day", label: "Daily" },
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
];

// ─── Date Range Presets ───────────────────────────────────────────────────────

export const DATE_RANGE_PRESETS: { label: string; value: DateRangePreset; days?: number }[] = [
  { label: "Last 7 days", value: "7d", days: 7 },
  { label: "Last 30 days", value: "30d", days: 30 },
  { label: "Last 90 days", value: "90d", days: 90 },
  { label: "Custom", value: "custom" },
];

// ─── Plan Labels ──────────────────────────────────────────────────────────────

export const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  growth: "Growth",
  scale: "Scale",
};

export const PLAN_COLORS: Record<string, string> = {
  free: "neutral",
  starter: "info",
  growth: "success",
  scale: "warning",
};

// ─── Pagination Defaults ──────────────────────────────────────────────────────

export const DEFAULT_PAGE_SIZE = 25;
