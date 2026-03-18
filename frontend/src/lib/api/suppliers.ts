import { apiClient } from "./client";
import type {
  Supplier,
  CreateSupplierRequest,
  UpdateSupplierRequest,
  ProductSupplierLink,
  SupplierPerformanceSnapshot,
} from "@/types/api";

export async function getSuppliers(): Promise<Supplier[]> {
  return apiClient.get<Supplier[]>("/suppliers");
}

export async function createSupplier(data: CreateSupplierRequest): Promise<Supplier> {
  return apiClient.post<Supplier>("/suppliers", data);
}

export async function updateSupplier(
  supplierId: string,
  data: UpdateSupplierRequest
): Promise<Supplier> {
  return apiClient.patch<Supplier>(`/suppliers/${supplierId}`, data);
}

export async function deleteSupplier(supplierId: string): Promise<void> {
  return apiClient.delete<void>(`/suppliers/${supplierId}`);
}

export async function getSupplierLinks(supplierId: string): Promise<ProductSupplierLink[]> {
  return apiClient.get<ProductSupplierLink[]>(`/suppliers/${supplierId}/products`);
}

export async function getSupplierPerformance(
  supplierId: string
): Promise<SupplierPerformanceSnapshot[]> {
  return apiClient.get<SupplierPerformanceSnapshot[]>(`/suppliers/${supplierId}/performance`);
}
