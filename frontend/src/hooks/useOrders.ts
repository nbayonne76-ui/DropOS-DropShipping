import useSWR from "swr";
import { getOrders } from "@/lib/api/orders";
import type { Order, PaginatedResponse } from "@/types/api";
import type { OrderFilterParams } from "@/types/analytics";

interface UseOrdersOptions extends OrderFilterParams {}

interface UseOrdersResult {
  data: PaginatedResponse<Order> | undefined;
  orders: Order[];
  isLoading: boolean;
  isError: boolean;
  mutate: () => void;
}

export function useOrders(options: UseOrdersOptions = {}): UseOrdersResult {
  const key = ["orders", JSON.stringify(options)];

  const { data, error, isLoading, mutate } = useSWR<PaginatedResponse<Order>>(
    key,
    () => getOrders(options),
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
    }
  );

  return {
    data,
    orders: data?.items ?? [],
    isLoading,
    isError: !!error,
    mutate,
  };
}
