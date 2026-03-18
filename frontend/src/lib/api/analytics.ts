import { apiClient, getAccessToken } from "./client";
import type {
  AnalyticsSummaryResponse,
  TrendPoint,
  CostBreakdown,
  StoreComparison,
  TopProduct,
  TopOrder,
  CustomerAnalytics,
} from "@/types/api";
import type { AnalyticsFilterParams } from "@/types/analytics";

export async function getAnalyticsSummary(
  params: AnalyticsFilterParams
): Promise<AnalyticsSummaryResponse> {
  return apiClient.get<AnalyticsSummaryResponse>("/analytics/summary", {
    store_id: params.store_id,
    from_date: params.from,
    to_date: params.to,
    granularity: params.granularity ?? "day",
  });
}

export async function getProfitTrend(
  params: AnalyticsFilterParams
): Promise<TrendPoint[]> {
  return apiClient.get<TrendPoint[]>("/analytics/trends", {
    store_id: params.store_id,
    from_date: params.from,
    to_date: params.to,
    granularity: params.granularity ?? "day",
  });
}

export async function getCostBreakdown(
  params: AnalyticsFilterParams
): Promise<CostBreakdown> {
  return apiClient.get<CostBreakdown>("/analytics/costs", {
    store_id: params.store_id,
    from_date: params.from,
    to_date: params.to,
  });
}

export async function getStoreComparisons(
  params: Omit<AnalyticsFilterParams, "store_id">
): Promise<StoreComparison[]> {
  return apiClient.get<StoreComparison[]>("/analytics/stores/comparison", {
    from_date: params.from,
    to_date: params.to,
  });
}

export async function getTopProducts(
  params: AnalyticsFilterParams & { limit?: number }
): Promise<TopProduct[]> {
  return apiClient.get<TopProduct[]>("/analytics/top-products", {
    store_id: params.store_id,
    from_date: params.from,
    to_date: params.to,
    limit: params.limit ?? 10,
  });
}

export async function getTopOrders(
  params: AnalyticsFilterParams & { limit?: number }
): Promise<TopOrder[]> {
  return apiClient.get<TopOrder[]>("/analytics/top-orders", {
    store_id: params.store_id,
    from_date: params.from,
    to_date: params.to,
    limit: params.limit ?? 10,
  });
}

export async function getCustomers(
  params: AnalyticsFilterParams & { limit?: number }
): Promise<CustomerAnalytics[]> {
  return apiClient.get<CustomerAnalytics[]>("/analytics/customers", {
    store_id: params.store_id,
    from_date: params.from,
    to_date: params.to,
    limit: params.limit ?? 50,
  });
}

export async function exportOrdersCsv(
  params: AnalyticsFilterParams
): Promise<Blob> {
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";
  const qs = new URLSearchParams({
    from_date: params.from,
    to_date: params.to,
    ...(params.store_id ? { store_id: params.store_id } : {}),
  });
  const token = getAccessToken();
  const res = await fetch(
    `${BASE_URL}/api/v1/analytics/export/orders?${qs.toString()}`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} }
  );
  if (!res.ok) throw new Error("Export failed");
  return res.blob();
}

export async function exportAnalyticsCsv(
  params: AnalyticsFilterParams
): Promise<Blob> {
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";
  const qs = new URLSearchParams({
    from_date: params.from,
    to_date: params.to,
    granularity: params.granularity ?? "day",
    ...(params.store_id ? { store_id: params.store_id } : {}),
  });
  const token = getAccessToken();
  const res = await fetch(
    `${BASE_URL}/api/v1/analytics/export/summary?${qs.toString()}`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} }
  );
  if (!res.ok) throw new Error("Export failed");
  return res.blob();
}
