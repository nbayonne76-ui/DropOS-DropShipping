import { apiClient } from "./client";
import type { Supplier, SupplierPerformance } from "@/types/api";

export async function getSuppliers(): Promise<Supplier[]> {
  return apiClient.get<Supplier[]>("/suppliers");
}

export async function getSupplier(supplierId: string): Promise<Supplier> {
  return apiClient.get<Supplier>(`/suppliers/${supplierId}`);
}

export async function getSupplierPerformance(): Promise<SupplierPerformance[]> {
  return apiClient.get<SupplierPerformance[]>("/suppliers/performance");
}

export async function getSupplierPerformanceById(
  supplierId: string
): Promise<SupplierPerformance> {
  return apiClient.get<SupplierPerformance>(`/suppliers/${supplierId}/performance`);
}

export async function createSupplier(
  data: Omit<Supplier, "id" | "user_id" | "created_at">
): Promise<Supplier> {
  return apiClient.post<Supplier>("/suppliers", data);
}

export async function updateSupplier(
  supplierId: string,
  data: Partial<Omit<Supplier, "id" | "user_id" | "created_at">>
): Promise<Supplier> {
  return apiClient.patch<Supplier>(`/suppliers/${supplierId}`, data);
}

export async function deleteSupplier(supplierId: string): Promise<void> {
  return apiClient.delete<void>(`/suppliers/${supplierId}`);
}
