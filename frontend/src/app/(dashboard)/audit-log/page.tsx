"use client";

import { useState } from "react";
import useSWR from "swr";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { listAuditLog } from "@/lib/api/auditLog";
import { formatDate, formatRelativeTime } from "@/lib/formatters";
import type { AuditLogEntry } from "@/types/api";

// ─── Action metadata ──────────────────────────────────────────────────────────

type BadgeVariant = "success" | "warning" | "danger" | "neutral" | "info";

const ACTION_LABELS: Record<string, string> = {
  "order.fulfilled": "Order Fulfilled",
  "order.refunded": "Order Refunded",
  "order.costs_updated": "Costs Updated",
  "store.synced": "Store Synced",
  "store.created": "Store Created",
  "store.deleted": "Store Deleted",
  "team.member_invited": "Member Invited",
  "team.member_removed": "Member Removed",
  "team.role_changed": "Role Changed",
  "billing.plan_changed": "Plan Changed",
  "alert.fired": "Alert Fired",
  "api_key.created": "API Key Created",
  "api_key.revoked": "API Key Revoked",
};

const ACTION_VARIANTS: Record<string, BadgeVariant> = {
  "order.fulfilled": "success",
  "order.refunded": "warning",
  "order.costs_updated": "neutral",
  "store.synced": "info",
  "store.created": "success",
  "store.deleted": "danger",
  "team.member_invited": "info",
  "team.member_removed": "warning",
  "team.role_changed": "neutral",
  "billing.plan_changed": "info",
  "alert.fired": "warning",
  "api_key.created": "success",
  "api_key.revoked": "danger",
};

const RESOURCE_TYPE_FILTERS = [
  { value: "", label: "All" },
  { value: "order", label: "Orders" },
  { value: "team_member", label: "Team" },
  { value: "user", label: "Billing" },
  { value: "api_key", label: "API Keys" },
];

const PAGE_SIZE = 50;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AuditLogPage() {
  const [resourceType, setResourceType] = useState("");
  const [offset, setOffset] = useState(0);

  const { data: entries, isLoading } = useSWR<AuditLogEntry[]>(
    ["/audit-log", resourceType, offset],
    () => listAuditLog({ resource_type: resourceType || undefined, limit: PAGE_SIZE, offset }),
    { revalidateOnFocus: false }
  );

  const hasMore = (entries?.length ?? 0) === PAGE_SIZE;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        subtitle="Immutable record of all significant account actions"
      />

      {/* Filters */}
      <div className="flex gap-1.5 flex-wrap">
        {RESOURCE_TYPE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => { setResourceType(f.value); setOffset(0); }}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              resourceType === f.value
                ? "bg-primary-600 text-white border-primary-600"
                : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-start gap-4 py-3 border-b border-neutral-50 last:border-0">
                <Skeleton className="h-5 w-32 flex-shrink-0" />
                <Skeleton className="h-5 flex-1" />
                <Skeleton className="h-4 w-20 flex-shrink-0" />
              </div>
            ))}
          </div>
        ) : !entries?.length ? (
          <p className="text-sm text-neutral-400 py-8 text-center">
            No audit entries found.
          </p>
        ) : (
          <>
            <div className="divide-y divide-neutral-50">
              {entries.map((entry) => (
                <div key={entry.id} className="flex items-start gap-4 py-3 hover:bg-neutral-50/50 transition-colors">
                  {/* Action badge */}
                  <div className="flex-shrink-0 pt-0.5">
                    <Badge variant={ACTION_VARIANTS[entry.action] ?? "neutral"}>
                      {ACTION_LABELS[entry.action] ?? entry.action}
                    </Badge>
                  </div>

                  {/* Summary */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-neutral-800">{entry.summary}</p>
                    {entry.resource_id && (
                      <p className="text-xs font-mono text-neutral-400 mt-0.5 truncate">
                        {entry.resource_type && `${entry.resource_type} · `}{entry.resource_id}
                      </p>
                    )}
                  </div>

                  {/* Time */}
                  <div className="flex-shrink-0 text-right">
                    <p className="text-xs text-neutral-400" title={formatDate(entry.created_at, "PPpp")}>
                      {formatRelativeTime(entry.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between pt-4 mt-2 border-t border-neutral-100">
              <button
                disabled={offset === 0}
                onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
                className="text-sm text-primary-600 hover:underline disabled:text-neutral-300 disabled:no-underline"
              >
                ← Previous
              </button>
              <span className="text-xs text-neutral-400">
                Showing {offset + 1}–{offset + (entries?.length ?? 0)}
              </span>
              <button
                disabled={!hasMore}
                onClick={() => setOffset((o) => o + PAGE_SIZE)}
                className="text-sm text-primary-600 hover:underline disabled:text-neutral-300 disabled:no-underline"
              >
                Next →
              </button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
