// ─── Auth & User ────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  full_name: string;
  plan: "free" | "starter" | "growth" | "scale";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
}

export interface UpdateMeRequest {
  full_name?: string;
  password?: string;
}

// ─── Stores ─────────────────────────────────────────────────────────────────

export type StorePlatform = "shopify" | "woocommerce" | "etsy";
export type StoreSyncStatus = "idle" | "syncing" | "error" | "never_synced";

export interface Store {
  id: string;
  tenant_id: string;
  name: string;
  shopify_domain: string;
  /** Alias for shopify_domain — used in UI */
  domain: string;
  platform: StorePlatform;
  currency: string;
  is_active: boolean;
  sync_status: StoreSyncStatus;
  last_synced_at: string | null;
  orders_count: number;
  created_at: string;
  updated_at: string;
}

// ─── Orders ─────────────────────────────────────────────────────────────────

export type OrderStatus =
  | "pending"
  | "paid"
  | "fulfilled"
  | "refunded"
  | "cancelled";

export interface OrderLineItem {
  id: string;
  order_id: string;
  product_title: string;
  variant_title: string | null;
  quantity: number;
  unit_price_cents: number;
  total_price_cents: number;
  supplier_id: string | null;
  supplier_cost_cents: number | null;
}

export interface Order {
  id: string;
  store_id: string;
  order_number: string;
  status: OrderStatus;
  customer_email: string;
  gross_revenue_cents: number;
  supplier_cost_cents: number;
  platform_fee_cents: number;
  payment_fee_cents: number;
  shipping_cost_cents: number;
  return_cost_cents: number;
  ad_spend_cents: number;
  customs_duty_cents: number;
  other_cost_cents: number;
  net_profit_cents: number;
  profit_margin: number;
  currency: string;
  ordered_at: string;
  fulfilled_at: string | null;
  line_items: OrderLineItem[];
  created_at: string;
  updated_at: string;
}

export interface UpdateOrderCostsRequest {
  supplier_cost_cents?: number;
  platform_fee_cents?: number;
  payment_fee_cents?: number;
  shipping_cost_cents?: number;
  return_cost_cents?: number;
  ad_spend_cents?: number;
  customs_duty_cents?: number;
  other_cost_cents?: number;
}

// ─── Analytics ──────────────────────────────────────────────────────────────

export interface DashboardSummary {
  total_revenue_cents: number;
  total_profit_cents: number;
  avg_margin: number;
  orders_count: number;
  revenue_change_pct: number;
  profit_change_pct: number;
  margin_change_pct: number;
  orders_change_pct: number;
  period_start: string;
  period_end: string;
}

export interface TrendPoint {
  date: string;
  revenue_cents: number;
  profit_cents: number;
  orders_count: number;
}

export interface CostBreakdown {
  supplier_cost_cents: number;
  platform_fee_cents: number;
  payment_fee_cents: number;
  shipping_cost_cents: number;
  return_cost_cents: number;
  ad_spend_cents: number;
  customs_duty_cents: number;
  other_cost_cents: number;
  total_cost_cents: number;
  gross_revenue_cents: number;
}

export interface StoreComparison {
  store_id: string;
  store_name: string;
  revenue_cents: number;
  cost_cents: number;
  profit_cents: number;
  margin: number;
  orders_count: number;
}

export interface AnalyticsSummaryResponse {
  tenant_id: string;
  store_id: string | null;
  from_date: string;
  to_date: string;
  total_orders: number;
  gross_revenue: number;
  net_revenue: number;
  total_cost: number;
  net_profit: number;
  avg_profit_margin: string;
  total_refunds: number;
  refund_rate: string;
}

// ─── Suppliers ───────────────────────────────────────────────────────────────

export interface Supplier {
  id: string;
  user_id: string;
  name: string;
  country: string;
  contact_email: string | null;
  contact_name: string | null;
  website: string | null;
  notes: string | null;
  created_at: string;
}

export interface SupplierPerformance {
  supplier_id: string;
  supplier_name: string;
  country: string;
  composite_score: number;
  on_time_rate: number;
  stock_accuracy: number;
  dispute_rate: number;
  avg_fulfillment_days: number;
  total_orders: number;
  defect_rate: number;
}

// ─── Landed Cost ─────────────────────────────────────────────────────────────

export interface LandedCostRequest {
  product_cost_cents: number;
  shipping_cost_cents: number;
  customs_duty_rate: number;
  payment_fee_rate: number;
  platform_fee_rate: number;
  other_costs_cents?: number;
}

export interface LandedCostResponse {
  product_cost_cents: number;
  shipping_cost_cents: number;
  customs_duty_cents: number;
  payment_fee_cents: number;
  platform_fee_cents: number;
  other_costs_cents: number;
  total_landed_cost_cents: number;
  suggested_price_cents: number;
  suggested_margin: number;
}

// ─── Pagination ──────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ─── Errors ──────────────────────────────────────────────────────────────────

export interface ApiError {
  detail: string | { msg: string; type: string; loc: string[] }[];
  status_code?: number;
}
