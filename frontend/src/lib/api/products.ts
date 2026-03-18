import { apiClient, getAccessToken } from "./client";
import type { BulkCogsImportResult, Product, PaginatedResponse, UpdateProductRequest } from "@/types/api";

export interface ProductFilterParams {
  store_id?: string;
  page?: number;
  page_size?: number;
}

export async function getProducts(
  params: ProductFilterParams = {}
): Promise<PaginatedResponse<Product>> {
  return apiClient.get<PaginatedResponse<Product>>("/products", {
    store_id: params.store_id,
    page: params.page ?? 1,
    page_size: params.page_size ?? 50,
  });
}

export async function updateProduct(
  productId: string,
  data: UpdateProductRequest
): Promise<Product> {
  return apiClient.patch<Product>(`/products/${productId}`, data);
}

export async function bulkImportCogs(file: File): Promise<BulkCogsImportResult> {
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";
  const token = getAccessToken();
  const body = new FormData();
  body.append("file", file);
  const res = await fetch(`${BASE_URL}/api/v1/products/bulk-cogs`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Upload failed" }));
    throw new Error(typeof err.detail === "string" ? err.detail : "Upload failed");
  }
  return res.json() as Promise<BulkCogsImportResult>;
}
