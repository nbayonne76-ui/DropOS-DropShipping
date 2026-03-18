import useSWR from "swr";
import { getProducts, type ProductFilterParams } from "@/lib/api/products";
import { updateProduct } from "@/lib/api/products";
import type { Product, PaginatedResponse } from "@/types/api";

interface UseProductsResult {
  products: Product[];
  total: number;
  totalPages: number;
  isLoading: boolean;
  isError: boolean;
  mutate: () => void;
  update: (id: string, data: { hs_code?: string | null; origin_country?: string | null }) => Promise<Product>;
}

export function useProducts(params: ProductFilterParams = {}): UseProductsResult {
  const key = ["products", params.store_id, params.page, params.page_size];

  const { data, error, isLoading, mutate } = useSWR<PaginatedResponse<Product>>(
    key,
    () => getProducts(params),
    { revalidateOnFocus: false, dedupingInterval: 15_000 }
  );

  async function update(
    id: string,
    body: { hs_code?: string | null; origin_country?: string | null }
  ): Promise<Product> {
    const updated = await updateProduct(id, body);
    await mutate();
    return updated;
  }

  return {
    products: data?.items ?? [],
    total: data?.total ?? 0,
    totalPages: data?.total_pages ?? 1,
    isLoading,
    isError: !!error,
    mutate,
    update,
  };
}
