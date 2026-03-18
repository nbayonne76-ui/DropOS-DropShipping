"use client";

import { useState, useCallback } from "react";
import {
  Copy,
  Check,
  RefreshCw,
  Eye,
  EyeOff,
  Webhook,
} from "lucide-react";
import { cn, formatDate } from "@/lib/formatters";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useWebhookEvents } from "@/hooks/useWebhookEvents";
import { updateStore } from "@/lib/api/stores";
import type { Store, WebhookEventStatus } from "@/types/api";

interface WebhooksPanelProps {
  store: Store;
  onStoreUpdated: () => void;
}

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

const STATUS_CONFIG: Record<
  WebhookEventStatus,
  { label: string; variant: "success" | "warning" | "danger" | "neutral" }
> = {
  processed: { label: "Processed", variant: "success" },
  received:  { label: "Received",  variant: "info" as "neutral" },
  skipped:   { label: "Skipped",   variant: "neutral" },
  failed:    { label: "Failed",    variant: "danger" },
};

function useCopy(text: string) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);
  return { copied, copy };
}

function generateSecret(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function WebhooksPanel({ store, onStoreUpdated }: WebhooksPanelProps) {
  const webhookUrl = `${BASE_URL}/api/v1/webhooks/shopify/${store.id}`;
  const { copied: urlCopied, copy: copyUrl } = useCopy(webhookUrl);

  // Secret management
  const [secret, setSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const { copied: secretCopied, copy: copySecret } = useCopy(secret);

  const handleGenerate = () => setSecret(generateSecret());

  const handleSaveSecret = async () => {
    if (!secret.trim()) return;
    setSaving(true);
    setSaveError(null);
    setSaveOk(false);
    try {
      await updateStore(store.id, { webhook_secret: secret.trim() } as Parameters<typeof updateStore>[1]);
      setSaveOk(true);
      setSecret("");
      onStoreUpdated();
      setTimeout(() => setSaveOk(false), 3000);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save secret");
    } finally {
      setSaving(false);
    }
  };

  // Events
  const { events, isLoading, mutate } = useWebhookEvents(store.id, 25);

  return (
    <div className="space-y-6">
      {/* Webhook URL */}
      <div>
        <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
          Webhook Endpoint URL
        </h4>
        <p className="text-xs text-neutral-500 mb-2">
          Register this URL in your Shopify store under{" "}
          <span className="font-medium text-neutral-700">
            Settings → Notifications → Webhooks
          </span>
          .
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-800 font-mono truncate">
            {webhookUrl}
          </code>
          <button
            onClick={copyUrl}
            title="Copy URL"
            className="flex-shrink-0 p-2 rounded-lg border border-neutral-200 bg-white text-neutral-500 hover:text-primary-600 hover:border-primary-300 transition-colors"
          >
            {urlCopied ? (
              <Check className="w-4 h-4 text-emerald-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              store.webhook_configured ? "bg-emerald-500" : "bg-neutral-300"
            )}
          />
          <span className="text-xs text-neutral-500">
            {store.webhook_configured
              ? "Webhook secret is configured"
              : "No webhook secret set — verification disabled"}
          </span>
        </div>
      </div>

      {/* Topics to subscribe */}
      <div>
        <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
          Recommended Topics
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {[
            "orders/create",
            "orders/paid",
            "orders/updated",
            "orders/cancelled",
            "orders/refunded",
            "app/uninstalled",
          ].map((t) => (
            <span
              key={t}
              className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-mono text-neutral-700"
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Secret management */}
      <div>
        <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
          Webhook Secret
        </h4>
        <p className="text-xs text-neutral-500 mb-3">
          Paste the secret Shopify shows after creating the webhook, or generate
          one here and paste it into Shopify.
        </p>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type={showSecret ? "text" : "password"}
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Paste or generate a secret…"
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 pr-9 text-sm font-mono text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => setShowSecret((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
            >
              {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {secret && (
            <button
              onClick={copySecret}
              title="Copy secret"
              className="flex-shrink-0 p-2 rounded-lg border border-neutral-200 bg-white text-neutral-500 hover:text-primary-600 hover:border-primary-300 transition-colors"
            >
              {secretCopied ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          )}
          <Button
            variant="secondary"
            onClick={handleGenerate}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Generate
          </Button>
          <Button
            onClick={handleSaveSecret}
            disabled={!secret.trim() || saving}
          >
            {saving ? "Saving…" : saveOk ? "Saved ✓" : "Save"}
          </Button>
        </div>
        {saveError && (
          <p className="mt-2 text-xs text-danger-600">{saveError}</p>
        )}
      </div>

      {/* Recent events */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
            Recent Events
          </h4>
          <button
            onClick={() => mutate()}
            title="Refresh"
            className="p-1 rounded text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="rounded-lg border border-neutral-200 overflow-hidden">
          <table className="min-w-full">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="px-3 py-2 text-left text-xs font-semibold text-neutral-500">
                  Topic
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-neutral-500">
                  Status
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-neutral-500">
                  Received
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-3 py-2"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-3 py-2 text-right"><Skeleton className="h-4 w-24 ml-auto" /></td>
                  </tr>
                ))
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-8 text-center">
                    <div className="flex flex-col items-center gap-2 text-neutral-400">
                      <Webhook className="w-6 h-6 opacity-40" />
                      <span className="text-xs">No webhook events received yet</span>
                    </div>
                  </td>
                </tr>
              ) : (
                events.map((event) => {
                  const cfg = STATUS_CONFIG[event.status] ?? STATUS_CONFIG.received;
                  return (
                    <tr key={event.id} className="hover:bg-neutral-50/50">
                      <td className="px-3 py-2">
                        <code className="text-xs font-mono text-neutral-700">
                          {event.topic}
                        </code>
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
                        {event.error_message && (
                          <p className="mt-0.5 text-xs text-danger-600 truncate max-w-[200px]" title={event.error_message}>
                            {event.error_message}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right text-xs text-neutral-400 tabular-nums whitespace-nowrap">
                        {formatDate(event.created_at, "MMM d, HH:mm:ss")}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
