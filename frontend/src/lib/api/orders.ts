import { apiClient, getAccessToken } from "./client";
import type { FulfillOrderRequest, Order, PaginatedResponse, UpdateOrderCostsRequest } from "@/types/api";
import type { OrderFilterParams } from "@/types/analytics";

export async function getOrders(
  params: OrderFilterParams = {}
): Promise<PaginatedResponse<Order>> {
  return apiClient.get<PaginatedResponse<Order>>("/orders", {
    store_id: params.store_id,
    status: params.status,
    from_date: params.from,
    to_date: params.to,
    page: params.page ?? 1,
    page_size: params.page_size ?? 25,
  });
}

export async function getOrder(orderId: string): Promise<Order> {
  return apiClient.get<Order>(`/orders/${orderId}`);
}

export async function updateOrderCosts(
  orderId: string,
  data: UpdateOrderCostsRequest
): Promise<Order> {
  return apiClient.patch<Order>(`/orders/${orderId}/costs`, data);
}

export async function recalculateOrderProfit(orderId: string): Promise<Order> {
  return apiClient.post<Order>(`/orders/${orderId}/recalculate`);
}

export async function fulfillOrder(
  orderId: string,
  data: FulfillOrderRequest = {}
): Promise<Order> {
  return apiClient.post<Order>(`/orders/${orderId}/fulfill`, data);
}

export async function exportOrdersCsv(
  params: OrderFilterParams = {}
): Promise<Blob> {
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";
  const qs = new URLSearchParams();
  if (params.store_id) qs.set("store_id", params.store_id);
  if (params.status) qs.set("status", params.status);
  if (params.from) qs.set("from_date", params.from);
  if (params.to) qs.set("to_date", params.to);
  const token = getAccessToken();
  const res = await fetch(
    `${BASE_URL}/api/v1/orders/export?${qs.toString()}`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} }
  );
  if (!res.ok) throw new Error("Export failed");
  return res.blob();
}
