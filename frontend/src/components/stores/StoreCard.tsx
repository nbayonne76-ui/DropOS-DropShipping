"use client";

import { RefreshCw, Unlink, CheckCircle2, AlertCircle, Clock, Loader2 } from "lucide-react";
import { cn, formatDate } from "@/lib/formatters";
import type { Store, StoreSyncStatus } from "@/types/api";
import { Badge } from "@/components/ui/Badge";

interface StoreCardProps {
  store: Store;
  isSyncing?: boolean;
  onSync: (storeId: string) => void;
  onDisconnect?: (storeId: string) => void;
}

const syncStatusConfig: Record<
  StoreSyncStatus,
  { label: string; variant: "success" | "warning" | "danger" | "neutral"; icon: React.ElementType }
> = {
  idle: { label: "Up to date", variant: "success", icon: CheckCircle2 },
  syncing: { label: "Syncing…", variant: "info" as "neutral", icon: Loader2 },
  error: { label: "Sync error", variant: "danger", icon: AlertCircle },
  never_synced: { label: "Never synced", variant: "neutral", icon: Clock },
};

export function StoreCard({ store, isSyncing = false, onSync, onDisconnect }: StoreCardProps) {
  const status = isSyncing ? "syncing" : store.sync_status;
  const statusCfg = syncStatusConfig[status] ?? syncStatusConfig.idle;
  const StatusIcon = statusCfg.icon;

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Store name & platform */}
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-xs font-bold text-neutral-600 uppercase flex-shrink-0">
              {store.platform.slice(0, 2)}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-neutral-900 truncate">
                {store.name}
              </h3>
              <p className="text-xs text-neutral-400 truncate">{store.domain}</p>
            </div>
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-4 mt-3">
            <div>
              <p className="text-xs text-neutral-400">Currency</p>
              <p className="text-sm font-medium text-neutral-700">{store.currency}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-400">Orders</p>
              <p className="text-sm font-medium text-neutral-700">
                {store.orders_count.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-400">Last synced</p>
              <p className="text-sm font-medium text-neutral-700">
                {store.last_synced_at
                  ? formatDate(store.last_synced_at, "MMM d, HH:mm")
                  : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <Badge variant={statusCfg.variant}>
            <StatusIcon
              className={cn(
                "w-3 h-3",
                status === "syncing" && "animate-spin"
              )}
            />
            {statusCfg.label}
          </Badge>

          <div className="flex items-center gap-1 mt-1">
            <button
              onClick={() => onSync(store.id)}
              disabled={isSyncing}
              title="Sync now"
              className="p-1.5 rounded-lg text-neutral-400 hover:text-primary-600 hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
            </button>
            {onDisconnect && (
              <button
                onClick={() => onDisconnect(store.id)}
                title="Disconnect store"
                className="p-1.5 rounded-lg text-neutral-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"
              >
                <Unlink className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
