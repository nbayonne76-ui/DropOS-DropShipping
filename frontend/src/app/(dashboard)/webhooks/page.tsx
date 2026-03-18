"use client";

import { useState } from "react";
import useSWR from "swr";
import { RefreshCw, Webhook } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useStores } from "@/hooks/useStores";
import { getWebhookEvents } from "@/lib/api/webhooks";
import { formatDate } from "@/lib/formatters";
import type { WebhookEvent, WebhookEventStatus } from "@/types/api";

const STATUS_VARIANT: Record<WebhookEventStatus, "neutral" | "success" | "danger" | "warning"> = {
  received: "neutral",
  processed: "success",
  failed: "danger",
  skipped: "warning",
};

const LIMIT_OPTIONS = [20, 50, 100];

export default function WebhooksPage() {
  const { stores } = useStores();
  const [storeFilter, setStoreFilter] = useState("");
  const [limit, setLimit] = useState(20);

  const {
    data: events,
    isLoading,
    mutate,
    isValidating,
  } = useSWR<WebhookEvent[]>(
    ["webhooks/events", storeFilter, limit],
    () => getWebhookEvents(storeFilter || undefined, limit),
    { revalidateOnFocus: false, dedupingInterval: 15_000 }
  );

  const failed = events?.filter((e) => e.status === "failed").length ?? 0;
  const processed = events?.filter((e) => e.status === "processed").length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Webhook Events"
        subtitle={
          events
            ? `${events.length} event${events.length !== 1 ? "s" : ""}${failed > 0 ? ` · ${failed} failed` : ""}`
            : "Recent Shopify webhook deliveries"
        }
        action={
          <Button
            variant="secondary"
            size="sm"
            loading={isValidating}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={() => mutate()}
          >
            Refresh
          </Button>
        }
      />

      {/* Summary pills */}
      {events && events.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-neutral-200 rounded-lg text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-neutral-600">{processed} processed</span>
          </div>
          {failed > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-danger-50 border border-danger-200 rounded-lg text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-danger-500" />
              <span className="text-danger-700 font-medium">{failed} failed</span>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={storeFilter}
          onChange={(e) => setStoreFilter(e.target.value)}
          className="input-base max-w-xs text-sm"
        >
          <option value="">All stores</option>
          {stores.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="input-base w-28 text-sm"
        >
          {LIMIT_OPTIONS.map((n) => (
            <option key={n} value={n}>Last {n}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700 text-xs text-zinc-500 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Topic</th>
                <th className="px-4 py-3 text-left">Store</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Error</th>
                <th className="px-4 py-3 text-right">Received</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : !events || events.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-zinc-400">
                      <Webhook className="w-8 h-8 opacity-40" />
                      <p className="text-sm">No webhook events found.</p>
                      <p className="text-xs max-w-xs">
                        Events appear here once Shopify sends webhooks to your connected stores.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                events.map((event) => (
                  <EventRow key={event.id} event={event} stores={stores} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function EventRow({
  event,
  stores,
}: {
  event: WebhookEvent;
  stores: { id: string; name: string }[];
}) {
  const [expanded, setExpanded] = useState(false);
  const storeName = stores.find((s) => s.id === event.store_id)?.name ?? event.store_id.slice(0, 8) + "…";

  return (
    <>
      <tr
        className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
        onClick={() => event.error_message && setExpanded((v) => !v)}
      >
        <td className="px-4 py-3">
          <span className="font-mono text-xs text-zinc-700 dark:text-zinc-300">
            {event.topic}
          </span>
        </td>
        <td className="px-4 py-3 text-zinc-500 text-xs">{storeName}</td>
        <td className="px-4 py-3">
          <Badge variant={STATUS_VARIANT[event.status]}>{event.status}</Badge>
        </td>
        <td className="px-4 py-3 text-xs text-danger-600 max-w-xs">
          {event.error_message ? (
            <span className="truncate block max-w-[200px]">{event.error_message}</span>
          ) : (
            <span className="text-zinc-300">—</span>
          )}
        </td>
        <td className="px-4 py-3 text-right text-xs text-zinc-400">
          {formatDate(event.created_at)}
        </td>
      </tr>
      {expanded && event.error_message && (
        <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-danger-50">
          <td colSpan={5} className="px-4 py-3">
            <p className="text-xs font-mono text-danger-700 whitespace-pre-wrap break-all">
              {event.error_message}
            </p>
          </td>
        </tr>
      )}
    </>
  );
}
