import type { FulfillmentStatus, OrderStatus } from "@/types/api";
import type { GranularityOption, DateRangePreset } from "@/types/analytics";

// ─── Cost Layer Labels ────────────────────────────────────────────────────────

export const COST_LAYER_LABELS: Record<string, string> = {
  cogs: "Supplier Cost (COGS)",
  shipping_cost: "Shipping Cost",
  platform_fee: "Platform Fee",
  payment_fee: "Payment Fee",
  chargeback_fee: "Chargeback Fee",
  refund_fee: "Refund Fee",
  fx_loss: "FX Loss",
  import_duty: "Import Duty",
};

export const COST_LAYER_COLORS: Record<string, string> = {
  cogs: "#6366f1",        // indigo
  shipping_cost: "#f59e0b", // amber
  platform_fee: "#8b5cf6",  // violet
  payment_fee: "#a78bfa",   // purple-light
  chargeback_fee: "#ef4444", // red
  refund_fee: "#f97316",    // orange
  fx_loss: "#10b981",       // emerald
  import_duty: "#3b82f6",   // blue
};

// ─── Fulfillment Status ───────────────────────────────────────────────────────

export const FULFILLMENT_STATUS_LABELS: Record<FulfillmentStatus, string> = {
  unfulfilled: "Unfulfilled",
  partial: "Partial",
  fulfilled: "Fulfilled",
};

export const FULFILLMENT_STATUS_COLORS: Record<
  FulfillmentStatus,
  "success" | "warning" | "danger" | "neutral" | "info"
> = {
  unfulfilled: "neutral",
  partial: "warning",
  fulfilled: "success",
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
  pro: "Pro",
};

export const PLAN_COLORS: Record<string, string> = {
  free: "neutral",
  starter: "info",
  growth: "success",
  pro: "warning",
};

// ─── Pagination Defaults ──────────────────────────────────────────────────────

export const DEFAULT_PAGE_SIZE = 25;
