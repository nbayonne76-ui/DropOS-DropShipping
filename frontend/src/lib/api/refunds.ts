import type { Refund } from "@/types/api";
import { apiClient } from "./client";

export async function listOrderRefunds(orderId: string): Promise<Refund[]> {
  return apiClient.get<Refund[]>(`/orders/${orderId}/refunds`);
}
