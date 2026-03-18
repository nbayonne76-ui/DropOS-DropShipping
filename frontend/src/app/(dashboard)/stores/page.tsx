"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Store as StoreIcon, Webhook, ChevronDown } from "lucide-react";
import { cn } from "@/lib/formatters";
import { PageHeader } from "@/components/layout/PageHeader";
import { StoreCard } from "@/components/stores/StoreCard";
import { WebhooksPanel } from "@/components/stores/WebhooksPanel";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useStores } from "@/hooks/useStores";
import { disconnectStore } from "@/lib/api/stores";

export default function StoresPage() {
  const { stores, isLoading, syncState, syncStore, mutate } = useStores();
  const [openWebhooksId, setOpenWebhooksId] = useState<string | null>(null);

  async function handleDisconnect(storeId: string) {
    if (!confirm("Disconnect this store? All synced data will be retained.")) return;
    try {
      await disconnectStore(storeId);
      mutate();
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
          <Link href="/stores/connect">
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
          <Link href="/stores/connect">
            <Button leftIcon={<Plus className="w-4 h-4" />}>
              Connect your first store
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {stores.map((store) => {
            const webhooksOpen = openWebhooksId === store.id;
            return (
              <div
                key={store.id}
                className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden"
              >
                {/* Store card (no wrapper border — card is inside the outer box) */}
                <div className="p-1">
                  <StoreCard
                    store={store}
                    flat
                    syncJobState={syncState[store.id] ?? { status: "idle" }}
                    onSync={syncStore}
                    onDisconnect={handleDisconnect}
                  />
                </div>

                {/* Webhooks toggle */}
                <div className="border-t border-neutral-100">
                  <button
                    onClick={() =>
                      setOpenWebhooksId(webhooksOpen ? null : store.id)
                    }
                    className="w-full flex items-center justify-between px-5 py-2.5 text-xs font-medium text-neutral-500 hover:bg-neutral-50 transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <Webhook className="w-3.5 h-3.5" />
                      Webhooks
                      {store.webhook_configured && (
                        <span className="ml-1 w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                      )}
                    </span>
                    <ChevronDown
                      className={cn(
                        "w-3.5 h-3.5 transition-transform",
                        webhooksOpen && "rotate-180"
                      )}
                    />
                  </button>

                  {webhooksOpen && (
                    <div className="px-5 pb-5 pt-3 border-t border-neutral-100">
                      <WebhooksPanel
                        store={store}
                        onStoreUpdated={mutate}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
