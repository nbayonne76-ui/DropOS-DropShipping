// ─── Auth & User ────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  plan: "free" | "starter" | "growth" | "pro";
  is_active: boolean;
  is_verified: boolean;
  timezone: string;
  avatar_url: string | null;
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
  full_name?: string | null;
  timezone?: string | null;
  avatar_url?: string | null;
  current_password?: string | null;
  new_password?: string | null;
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
  webhook_configured: boolean;
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
  shopify_line_item_id: string;
  shopify_product_id: string | null;
  shopify_variant_id: string | null;
  title: string;
  sku: string | null;
  quantity: number;
  unit_price: number;
  unit_cogs: number;
}

export type FulfillmentStatus = "unfulfilled" | "partial" | "fulfilled";

export interface Order {
  id: string;
  tenant_id: string;
  store_id: string;
  shopify_order_id: string;
  order_number: string;
  status: OrderStatus;
  customer_email: string | null;
  shipping_country: string | null;
  gross_revenue: number;
  refund_amount: number;
  net_revenue: number;
  cogs: number;
  shipping_cost: number;
  platform_fee: number;
  payment_fee: number;
  chargeback_fee: number;
  refund_fee: number;
  fx_loss: number;
  import_duty: number;
  total_cost: number;
  net_profit: number;
  profit_margin: string;
  currency: string;
  ordered_at: string;
  // Fulfillment
  fulfillment_status: FulfillmentStatus;
  shopify_fulfillment_id: string | null;
  tracking_number: string | null;
  tracking_company: string | null;
  fulfilled_at: string | null;
  line_items: OrderLineItem[];
  created_at: string;
  updated_at: string;
}

export interface FulfillOrderRequest {
  tracking_number?: string | null;
  tracking_company?: string | null;
  notify_customer?: boolean;
}

export interface UpdateOrderCostsRequest {
  cogs?: number;
  shipping_cost?: number;
  platform_fee?: number;
  payment_fee?: number;
  chargeback_fee?: number;
  refund_fee?: number;
  fx_loss?: number;
  import_duty?: number;
}

// ─── Analytics ──────────────────────────────────────────────────────────────


export interface TrendPoint {
  period: string;
  orders: number;
  gross_revenue: number;
  net_revenue: number;
  net_profit: number;
  avg_margin: string;
}

export interface CostBreakdown {
  tenant_id: string;
  store_id: string | null;
  from_date: string;
  to_date: string;
  cogs: number;
  shipping_cost: number;
  platform_fee: number;
  payment_fee: number;
  chargeback_fee: number;
  refund_fee: number;
  fx_loss: number;
  import_duty: number;
  total: number;
}

export interface StoreComparison {
  store_id: string;
  store_name: string;
  shopify_domain: string;
  orders: number;
  gross_revenue: number;
  net_revenue: number;
  net_profit: number;
  avg_margin: string;
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

// ─── Products ────────────────────────────────────────────────────────────────

export interface ProductVariant {
  id: string;
  product_id: string;
  shopify_variant_id: string;
  title: string;
  sku: string | null;
  price_cents: number;
  compare_at_price_cents: number | null;
  weight_grams: number | null;
  inventory_quantity: number;
  requires_shipping: boolean;
}

export interface Product {
  id: string;
  tenant_id: string;
  store_id: string;
  shopify_product_id: string;
  title: string;
  vendor: string | null;
  product_type: string | null;
  status: string;
  hs_code: string | null;
  origin_country: string | null;
  created_at: string;
  updated_at: string;
  variants: ProductVariant[];
}

export interface UpdateProductRequest {
  hs_code?: string | null;
  origin_country?: string | null;
}

export interface BulkCogsImportResult {
  updated: number;
  orders_recalculated: number;
  not_found_skus: string[];
}

// ─── Suppliers ───────────────────────────────────────────────────────────────

export interface Supplier {
  id: string;
  tenant_id: string;
  name: string;
  country: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  notes: string | null;
  api_endpoint: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierRequest {
  name: string;
  contact_email?: string | null;
  contact_phone?: string | null;
  website?: string | null;
  country?: string | null;
  notes?: string | null;
  api_key?: string | null;
  api_secret?: string | null;
  api_endpoint?: string | null;
}

export type UpdateSupplierRequest = Partial<CreateSupplierRequest>;


// ─── Tariffs & Landed Cost ────────────────────────────────────────────────────

export interface TariffLandedCostResponse {
  hs_code: string;
  origin_country: string;
  destination_country: string;
  value_cents: number;
  duty_rate: string;
  duty_cents: number;
  total_landed_cents: number;
  cached: boolean;
}

// ─── Top Products / Top Orders ────────────────────────────────────────────────

export interface TopProduct {
  shopify_product_id: string | null;
  title: string;
  sku: string | null;
  units_sold: number;
  gross_revenue: number;
  net_profit: number;
}

export interface TopOrder {
  order_id: string;
  shopify_order_id: string;
  order_number: string | null;
  store_id: string;
  ordered_at: string;
  net_revenue: number;
  net_profit: number;
  profit_margin: string | null;
}

// ─── Webhooks ─────────────────────────────────────────────────────────────────

export type WebhookEventStatus = "received" | "processed" | "failed" | "skipped";

export interface WebhookEvent {
  id: string;
  store_id: string;
  shopify_webhook_id: string;
  topic: string;
  status: WebhookEventStatus;
  error_message: string | null;
  created_at: string;
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export type JobStatus = "queued" | "in_progress" | "complete" | "not_found" | "deferred";

export interface JobStatusResponse {
  job_id: string;
  status: JobStatus;
  result: unknown | null;
  error: string | null;
}

export interface SyncStatusResponse {
  store_id: string;
  shopify_domain: string;
  is_active: boolean;
  last_synced_at: string | null;
  sync_cursor: string | null;
  job_id: string | null;
}

// ─── Pagination ──────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ─── Billing ─────────────────────────────────────────────────────────────────

export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled" | "free";

export interface SubscriptionResponse {
  plan: string;
  stripe_customer_id: string | null;
  status: SubscriptionStatus;
}

export interface CheckoutSessionResponse {
  url: string;
}

export interface BillingPortalResponse {
  url: string;
}

// ─── Notifications & Alert Rules ─────────────────────────────────────────────

export type AlertType = "margin_below" | "sync_failed" | "fulfillment_error" | "stock_below";

export interface AlertRule {
  id: string;
  tenant_id: string;
  store_id: string | null;
  alert_type: AlertType;
  threshold: number | null;
  window_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAlertRuleRequest {
  alert_type: AlertType;
  store_id?: string | null;
  threshold?: number | null;
  window_days?: number;
  is_active?: boolean;
}

export interface UpdateAlertRuleRequest {
  threshold?: number | null;
  window_days?: number | null;
  is_active?: boolean | null;
}

export interface Notification {
  id: string;
  tenant_id: string;
  rule_id: string | null;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface UnreadCountResponse {
  count: number;
}

// ─── Team ─────────────────────────────────────────────────────────────────────

export type TeamRole = "owner" | "admin" | "viewer";

export interface TeamMember {
  id: string;
  owner_id: string;
  user_id: string;
  role: TeamRole;
  email: string;
  full_name: string | null;
  created_at: string;
}

export interface InviteRequest {
  email: string;
  role: "admin" | "viewer";
}

export interface UpdateRoleRequest {
  role: "admin" | "viewer";
}

// ─── Refunds ─────────────────────────────────────────────────────────────────

export interface Refund {
  id: string;
  order_id: string;
  shopify_refund_id: string;
  amount: number;
  currency: string;
  reason: string | null;
  note: string | null;
  refunded_at: string | null;
  created_at: string;
}

// ─── API Keys ─────────────────────────────────────────────────────────────────

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
}

export interface ApiKeyCreated extends ApiKey {
  raw_key: string;
}

export interface CreateApiKeyRequest {
  name: string;
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  tenant_id: string;
  actor_id: string | null;
  action: string;
  summary: string;
  meta: string | null;
  resource_id: string | null;
  resource_type: string | null;
  created_at: string;
}

// ─── Customer Analytics ───────────────────────────────────────────────────────

export interface CustomerAnalytics {
  customer_email: string;
  order_count: number;
  total_gross_revenue: number;
  total_net_profit: number;
  avg_order_value: number;
  total_refunds: number;
  last_ordered_at: string;
}

// ─── Purchase Orders ─────────────────────────────────────────────────────────

export type POStatus = "draft" | "sent" | "confirmed" | "received" | "cancelled";

export interface PurchaseOrderItem {
  id: string;
  po_id: string;
  shopify_variant_id: string | null;
  sku: string | null;
  title: string;
  quantity: number;
  unit_cost_cents: number;
  total_cents: number;
}

export interface PurchaseOrder {
  id: string;
  tenant_id: string;
  supplier_id: string;
  supplier_name: string;
  reference: string | null;
  status: POStatus;
  notes: string | null;
  expected_delivery_date: string | null;
  received_at: string | null;
  items: PurchaseOrderItem[];
  total_cost_cents: number;
  created_at: string;
  updated_at: string;
}

export interface POItemRequest {
  title: string;
  sku?: string | null;
  shopify_variant_id?: string | null;
  quantity: number;
  unit_cost_cents: number;
}

export interface CreatePurchaseOrderRequest {
  supplier_id: string;
  reference?: string | null;
  notes?: string | null;
  expected_delivery_date?: string | null;
  items: POItemRequest[];
}

export interface UpdatePurchaseOrderRequest {
  reference?: string | null;
  notes?: string | null;
  expected_delivery_date?: string | null;
  status?: POStatus;
}

// ─── Supplier Extras ──────────────────────────────────────────────────────────

export interface ProductSupplierLink {
  id: string;
  supplier_id: string;
  shopify_product_id: string;
  shopify_variant_id: string | null;
  supplier_sku: string | null;
  unit_cost_cents: number;
  lead_time_days: number | null;
  moq: number | null;
}

export interface SupplierPerformanceSnapshot {
  id: string;
  supplier_id: string;
  period_start: string;
  period_end: string;
  total_orders: number;
  on_time_deliveries: number;
  defect_rate: string | null;
  avg_lead_time_days: string | null;
  total_cogs_cents: number;
}

// ─── Returns ─────────────────────────────────────────────────────────────────

export type ReturnStatus = "pending" | "approved" | "rejected" | "completed";
export type ReturnReason =
  | "defective"
  | "wrong_item"
  | "not_as_described"
  | "changed_mind"
  | "damaged_in_transit"
  | "other";

export interface ReturnItem {
  id: string;
  return_request_id: string;
  order_line_item_id: string | null;
  sku: string | null;
  title: string;
  quantity: number;
  created_at: string;
}

export interface ReturnRequest {
  id: string;
  tenant_id: string;
  order_id: string;
  status: ReturnStatus;
  reason: ReturnReason;
  notes: string | null;
  resolution_notes: string | null;
  refund_amount_cents: number;
  resolved_at: string | null;
  items: ReturnItem[];
  created_at: string;
  updated_at: string;
}

export interface ReturnItemRequest {
  order_line_item_id?: string | null;
  sku?: string | null;
  title: string;
  quantity: number;
}

export interface CreateReturnRequest {
  order_id: string;
  reason: ReturnReason;
  notes?: string | null;
  items: ReturnItemRequest[];
}

export interface UpdateReturnRequest {
  status?: ReturnStatus | null;
  resolution_notes?: string | null;
  refund_amount_cents?: number | null;
}

// ─── Errors ──────────────────────────────────────────────────────────────────

export interface ApiError {
  detail: string | { msg: string; type: string; loc: string[] }[];
  status_code?: number;
}
