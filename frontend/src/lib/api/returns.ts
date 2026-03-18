import type {
  CreateReturnRequest,
  ReturnRequest,
  UpdateReturnRequest,
} from "@/types/api";
import { apiClient } from "./client";

export async function listReturns(params?: {
  order_id?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<ReturnRequest[]> {
  return apiClient.get<ReturnRequest[]>("/returns", params);
}

export async function getReturn(returnId: string): Promise<ReturnRequest> {
  return apiClient.get<ReturnRequest>(`/returns/${returnId}`);
}

export async function createReturn(data: CreateReturnRequest): Promise<ReturnRequest> {
  return apiClient.post<ReturnRequest>("/returns", data);
}

export async function updateReturn(
  returnId: string,
  data: UpdateReturnRequest
): Promise<ReturnRequest> {
  return apiClient.patch<ReturnRequest>(`/returns/${returnId}`, data);
}

export async function deleteReturn(returnId: string): Promise<void> {
  return apiClient.delete<void>(`/returns/${returnId}`);
}
