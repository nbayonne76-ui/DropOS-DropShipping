import useSWR from "swr";
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from "@/lib/api/suppliers";
import type { Supplier, CreateSupplierRequest, UpdateSupplierRequest } from "@/types/api";

interface UseSuppliersResult {
  suppliers: Supplier[];
  isLoading: boolean;
  isError: boolean;
  create: (data: CreateSupplierRequest) => Promise<Supplier>;
  update: (id: string, data: UpdateSupplierRequest) => Promise<Supplier>;
  remove: (id: string) => Promise<void>;
}

export function useSuppliers(): UseSuppliersResult {
  const { data, error, isLoading, mutate } = useSWR<Supplier[]>(
    "/suppliers",
    () => getSuppliers(),
    { revalidateOnFocus: false, dedupingInterval: 15_000 }
  );

  async function create(data: CreateSupplierRequest): Promise<Supplier> {
    const supplier = await createSupplier(data);
    await mutate();
    return supplier;
  }

  async function update(id: string, data: UpdateSupplierRequest): Promise<Supplier> {
    const supplier = await updateSupplier(id, data);
    await mutate();
    return supplier;
  }

  async function remove(id: string): Promise<void> {
    await deleteSupplier(id);
    await mutate();
  }

  return {
    suppliers: data ?? [],
    isLoading,
    isError: !!error,
    create,
    update,
    remove,
  };
}
