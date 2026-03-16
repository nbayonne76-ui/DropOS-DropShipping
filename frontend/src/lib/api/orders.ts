import { apiClient } from "./client";
import type { Order, PaginatedResponse, UpdateOrderCostsRequest } from "@/types/api";
import type { OrderFilterParams } from "@/types/analytics";

export async function getOrders(
  params: OrderFilterParams = {}
): Promise<PaginatedResponse<Order>> {
  return apiClient.get<PaginatedResponse<Order>>("/orders", {
    store_id: params.store_id,
    status: params.status,
    from: params.from,
    to: params.to,
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
