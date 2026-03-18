import { apiClient } from "./client";
import type {
  PurchaseOrder,
  CreatePurchaseOrderRequest,
  UpdatePurchaseOrderRequest,
} from "@/types/api";

export async function listPurchaseOrders(params?: {
  supplier_id?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<PurchaseOrder[]> {
  const query = new URLSearchParams();
  if (params?.supplier_id) query.set("supplier_id", params.supplier_id);
  if (params?.status) query.set("status", params.status);
  if (params?.limit != null) query.set("limit", String(params.limit));
  if (params?.offset != null) query.set("offset", String(params.offset));
  const qs = query.toString();
  return apiClient.get<PurchaseOrder[]>(`/purchase-orders${qs ? `?${qs}` : ""}`);
}

export async function getPurchaseOrder(poId: string): Promise<PurchaseOrder> {
  return apiClient.get<PurchaseOrder>(`/purchase-orders/${poId}`);
}

export async function createPurchaseOrder(
  data: CreatePurchaseOrderRequest
): Promise<PurchaseOrder> {
  return apiClient.post<PurchaseOrder>("/purchase-orders", data);
}

export async function updatePurchaseOrder(
  poId: string,
  data: UpdatePurchaseOrderRequest
): Promise<PurchaseOrder> {
  return apiClient.patch<PurchaseOrder>(`/purchase-orders/${poId}`, data);
}

export async function deletePurchaseOrder(poId: string): Promise<void> {
  return apiClient.delete<void>(`/purchase-orders/${poId}`);
}
