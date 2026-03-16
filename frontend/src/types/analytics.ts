import type { TrendPoint, CostBreakdown, StoreComparison } from "./api";

// ─── Date Range ───────────────────────────────────────────────────────────────

export interface DateRange {
  from: Date;
  to: Date;
}

export type DateRangePreset = "7d" | "30d" | "90d" | "custom";

// ─── Granularity ─────────────────────────────────────────────────────────────

export type Granularity = "day" | "week" | "month";

export interface GranularityOption {
  value: Granularity;
  label: string;
}

// ─── KPI Cards ───────────────────────────────────────────────────────────────

export type KPIVariant = "revenue" | "profit" | "margin" | "orders" | "neutral";

export interface KPICardData {
  title: string;
  value: string;
  subtitle?: string;
  changePct?: number;
  variant?: KPIVariant;
}

// ─── Chart Data Helpers ───────────────────────────────────────────────────────

export interface ProfitTrendChartData extends TrendPoint {
  formattedDate: string;
}

export interface CostBreakdownSlice {
  name: string;
  key: keyof CostBreakdown;
  value_cents: number;
  pct: number;
  color: string;
}

export interface StoreCompareBarData extends StoreComparison {
  revenue_k: number;
  cost_k: number;
  profit_k: number;
}

// ─── Filter Params ────────────────────────────────────────────────────────────

export interface AnalyticsFilterParams {
  store_id?: string;
  from: string; // ISO date string
  to: string;   // ISO date string
  granularity?: Granularity;
}

export interface OrderFilterParams {
  store_id?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  page_size?: number;
}
