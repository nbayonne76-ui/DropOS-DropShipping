import { apiClient } from "./client";
import type {
  AnalyticsSummaryResponse,
  TrendPoint,
  CostBreakdown,
  StoreComparison,
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

export async function exportAnalytics(
  params: AnalyticsFilterParams,
  format: "csv" | "xlsx" = "csv"
): Promise<Blob> {
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";
  const qs = new URLSearchParams({
    from: params.from,
    to: params.to,
    format,
    ...(params.store_id ? { store_id: params.store_id } : {}),
  });
  const res = await fetch(
    `${BASE_URL}/api/v1/analytics/export?${qs.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${document.cookie.match(/access_token=([^;]+)/)?.[1] ?? ""}`,
      },
    }
  );
  if (!res.ok) throw new Error("Export failed");
  return res.blob();
}
