"use client";

import Link from "next/link";
import { Plus, Store as StoreIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StoreCard } from "@/components/stores/StoreCard";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useStores } from "@/hooks/useStores";
import { disconnectStore } from "@/lib/api/stores";

export default function StoresPage() {
  const { stores, isLoading, syncingId, syncStore, mutate } = useStores();

  async function handleDisconnect(storeId: string) {
    if (!confirm("Disconnect this store? All synced data will be retained.")) return;
    try {
      await disconnectStore(storeId);
      await mutate();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to disconnect store");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Connected Stores"
        subtitle={`${stores.length} store${stores.length !== 1 ? "s" : ""} connected`}
        action={
          <Link href="/dashboard/stores/connect">
            <Button leftIcon={<Plus className="w-4 h-4" />}>
              Connect Store
            </Button>
          </Link>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : stores.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mb-4">
            <StoreIcon className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="text-base font-semibold text-neutral-900 mb-1">
            No stores connected
          </h3>
          <p className="text-sm text-neutral-500 mb-6 max-w-sm">
            Connect your Shopify or WooCommerce store to start tracking
            profits automatically.
          </p>
          <Link href="/dashboard/stores/connect">
            <Button leftIcon={<Plus className="w-4 h-4" />}>
              Connect your first store
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stores.map((store) => (
            <StoreCard
              key={store.id}
              store={store}
              isSyncing={syncingId === store.id}
              onSync={syncStore}
              onDisconnect={handleDisconnect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
