"use client";

import { useState, useEffect } from "react";
import { Plus, X, RotateCcw, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  listReturns,
  createReturn,
  updateReturn,
  deleteReturn,
} from "@/lib/api/returns";
import { formatCents, formatRelativeTime, formatDate } from "@/lib/formatters";
import type {
  ReturnRequest,
  ReturnStatus,
  ReturnReason,
  ReturnItemRequest,
  CreateReturnRequest,
} from "@/types/api";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: "All", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "Completed", value: "completed" },
];

const STATUS_VARIANT: Record<ReturnStatus, "neutral" | "info" | "warning" | "success" | "danger"> = {
  pending: "warning",
  approved: "info",
  rejected: "danger",
  completed: "success",
};

const REASON_LABELS: Record<ReturnReason, string> = {
  defective: "Defective",
  wrong_item: "Wrong Item",
  not_as_described: "Not as Described",
  changed_mind: "Changed Mind",
  damaged_in_transit: "Damaged in Transit",
  other: "Other",
};

const RETURN_REASONS = Object.keys(REASON_LABELS) as ReturnReason[];

// What action is available for each status
const NEXT_ACTIONS: Record<ReturnStatus, { label: string; status: ReturnStatus }[]> = {
  pending: [
    { label: "Approve", status: "approved" },
    { label: "Reject", status: "rejected" },
  ],
  approved: [
    { label: "Mark Completed", status: "completed" },
    { label: "Reject", status: "rejected" },
  ],
  rejected: [],
  completed: [],
};

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Resolve Modal (approve / complete) ───────────────────────────────────────

function ResolveModal({
  returnReq,
  targetStatus,
  onConfirm,
  onCancel,
}: {
  returnReq: ReturnRequest;
  targetStatus: ReturnStatus;
  onConfirm: (rr: ReturnRequest) => void;
  onCancel: () => void;
}) {
  const [resolutionNotes, setResolutionNotes] = useState(returnReq.resolution_notes ?? "");
  const [refundDollars, setRefundDollars] = useState(
    returnReq.refund_amount_cents > 0 ? (returnReq.refund_amount_cents / 100).toFixed(2) : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isApprove = targetStatus === "approved";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updated = await updateReturn(returnReq.id, {
        status: targetStatus,
        resolution_notes: resolutionNotes.trim() || null,
        refund_amount_cents: refundDollars
          ? Math.round(parseFloat(refundDollars) * 100)
          : returnReq.refund_amount_cents,
      });
      onConfirm(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="text-xs text-danger-600 bg-danger-50 rounded-lg px-3 py-2">{error}</p>
      )}

      {isApprove && (
        <div>
          <label className="label-base">Refund Amount ($)</label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={refundDollars}
            onChange={(e) => setRefundDollars(e.target.value)}
            placeholder="0.00"
            className="input-base"
          />
        </div>
      )}

      <div>
        <label className="label-base">Resolution Notes</label>
        <textarea
          value={resolutionNotes}
          onChange={(e) => setResolutionNotes(e.target.value)}
          placeholder={isApprove ? "Approval notes…" : "Reason for rejection…"}
          rows={3}
          className="input-base resize-none"
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
        <Button
          type="submit"
          size="sm"
          loading={saving}
          variant={targetStatus === "rejected" ? "danger" : "primary"}
        >
          {targetStatus === "approved"
            ? "Approve"
            : targetStatus === "rejected"
            ? "Reject"
            : "Mark Completed"}
        </Button>
      </div>
    </form>
  );
}

// ─── Create Return Form ────────────────────────────────────────────────────────

const EMPTY_ITEM: ReturnItemRequest = { title: "", sku: null, quantity: 1 };

function CreateReturnForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (rr: ReturnRequest) => void;
  onCancel: () => void;
}) {
  const [orderId, setOrderId] = useState("");
  const [reason, setReason] = useState<ReturnReason>("defective");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ReturnItemRequest[]>([{ ...EMPTY_ITEM }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addItem() {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateItem(
    idx: number,
    field: keyof ReturnItemRequest,
    value: string | number | null
  ) {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orderId.trim()) { setError("Order ID is required"); return; }
    if (items.some((it) => !it.title.trim())) { setError("All items need a title"); return; }
    setSaving(true);
    setError(null);
    try {
      const payload: CreateReturnRequest = {
        order_id: orderId.trim(),
        reason,
        notes: notes.trim() || null,
        items: items.map((it) => ({
          title: it.title.trim(),
          sku: it.sku?.trim() || null,
          quantity: Number(it.quantity),
        })),
      };
      const rr = await createReturn(payload);
      onSubmit(rr);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create return request");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <p className="text-xs text-danger-600 bg-danger-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label-base">Order ID <span className="text-danger-500">*</span></label>
          <input
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="Paste order UUID…"
            className="input-base font-mono text-xs"
            required
          />
        </div>
        <div>
          <label className="label-base">Reason <span className="text-danger-500">*</span></label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as ReturnReason)}
            className="input-base"
            required
          >
            {RETURN_REASONS.map((r) => (
              <option key={r} value={r}>{REASON_LABELS[r]}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label-base">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional context…"
          rows={2}
          className="input-base resize-none"
        />
      </div>

      {/* Items */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-neutral-700 uppercase tracking-wide">
            Return Items
          </label>
          <button
            type="button"
            onClick={addItem}
            className="text-xs text-primary-600 hover:text-primary-700 font-medium"
          >
            + Add item
          </button>
        </div>
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-5">
                {idx === 0 && <p className="text-[10px] text-neutral-400 mb-1">Title *</p>}
                <input
                  value={item.title}
                  onChange={(e) => updateItem(idx, "title", e.target.value)}
                  placeholder="Product name"
                  className="input-base text-xs"
                  required
                />
              </div>
              <div className="col-span-3">
                {idx === 0 && <p className="text-[10px] text-neutral-400 mb-1">SKU</p>}
                <input
                  value={item.sku ?? ""}
                  onChange={(e) => updateItem(idx, "sku", e.target.value || null)}
                  placeholder="SKU"
                  className="input-base text-xs"
                />
              </div>
              <div className="col-span-3">
                {idx === 0 && <p className="text-[10px] text-neutral-400 mb-1">Qty *</p>}
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))}
                  className="input-base text-xs"
                  required
                />
              </div>
              <div className="col-span-1 flex justify-end pb-0.5">
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="p-1 text-neutral-300 hover:text-danger-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
        <Button type="submit" size="sm" loading={saving}>Submit Return</Button>
      </div>
    </form>
  );
}

// ─── Return Row ───────────────────────────────────────────────────────────────

function ReturnRow({
  rr,
  onAction,
  onDelete,
}: {
  rr: ReturnRequest;
  onAction: (rr: ReturnRequest, targetStatus: ReturnStatus) => void;
  onDelete: (rr: ReturnRequest) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const nextActions = NEXT_ACTIONS[rr.status];

  return (
    <div className="border border-neutral-200 rounded-xl bg-white overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-4 px-4 py-3">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="p-1 text-neutral-400 hover:text-neutral-700 flex-shrink-0"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 items-center">
          <div>
            <p className="text-sm font-medium text-neutral-900 truncate">
              {REASON_LABELS[rr.reason]}
            </p>
            <p className="text-xs text-neutral-400 font-mono truncate">
              {rr.order_id.slice(0, 8)}…
            </p>
          </div>
          <div>
            <Badge variant={STATUS_VARIANT[rr.status]}>{rr.status}</Badge>
          </div>
          <div className="hidden sm:block">
            <p className="text-xs text-neutral-500">
              {rr.items.length} item{rr.items.length !== 1 ? "s" : ""}
            </p>
            {rr.refund_amount_cents > 0 && (
              <p className="text-xs font-medium text-neutral-900 tabular-nums">
                Refund: {formatCents(rr.refund_amount_cents)}
              </p>
            )}
          </div>
          <div className="hidden sm:block">
            <p className="text-xs text-neutral-400">{formatRelativeTime(rr.created_at)}</p>
            {rr.resolved_at && (
              <p className="text-xs text-neutral-400">
                Resolved {formatDate(rr.resolved_at)}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {nextActions.map((action) => (
            <Button
              key={action.status}
              size="sm"
              variant={action.status === "rejected" ? "ghost" : "secondary"}
              onClick={() => onAction(rr, action.status)}
              className={
                action.status === "rejected"
                  ? "text-danger-500 hover:text-danger-700 hover:bg-danger-50"
                  : ""
              }
            >
              {action.label}
            </Button>
          ))}
          {rr.status === "pending" && (
            <button
              onClick={() => onDelete(rr)}
              className="p-1.5 rounded-lg text-neutral-300 hover:text-danger-500 hover:bg-danger-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-neutral-100 bg-neutral-50 px-4 py-3 space-y-3">
          {rr.notes && (
            <p className="text-xs text-neutral-500 italic">
              <span className="font-semibold text-neutral-600 not-italic">Note: </span>
              {rr.notes}
            </p>
          )}
          {rr.resolution_notes && (
            <p className="text-xs text-neutral-500 italic">
              <span className="font-semibold text-neutral-600 not-italic">Resolution: </span>
              {rr.resolution_notes}
            </p>
          )}

          <table className="w-full text-xs">
            <thead>
              <tr className="text-neutral-400 uppercase tracking-wide">
                <th className="text-left pb-1.5 font-semibold">Item</th>
                <th className="text-left pb-1.5 font-semibold">SKU</th>
                <th className="text-right pb-1.5 font-semibold">Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rr.items.map((item) => (
                <tr key={item.id}>
                  <td className="py-1.5 text-neutral-800 font-medium">{item.title}</td>
                  <td className="py-1.5 text-neutral-400 font-mono">{item.sku ?? "—"}</td>
                  <td className="py-1.5 text-right tabular-nums text-neutral-700">
                    {item.quantity}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReturnsPage() {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [resolving, setResolving] = useState<{
    rr: ReturnRequest;
    target: ReturnStatus;
  } | null>(null);

  useEffect(() => {
    setLoading(true);
    listReturns({ status: statusFilter || undefined })
      .then(setReturns)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [statusFilter]);

  function handleCreated(rr: ReturnRequest) {
    setReturns((prev) => [rr, ...prev]);
    setShowCreate(false);
  }

  function handleActionClick(rr: ReturnRequest, target: ReturnStatus) {
    setResolving({ rr, target });
  }

  function handleResolved(updated: ReturnRequest) {
    setReturns((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setResolving(null);
  }

  async function handleDelete(rr: ReturnRequest) {
    try {
      await deleteReturn(rr.id);
      setReturns((prev) => prev.filter((r) => r.id !== rr.id));
    } catch { /* ignore */ }
  }

  const pending = returns.filter((r) => r.status === "pending").length;

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Returns"
          subtitle={`${returns.length} request${returns.length !== 1 ? "s" : ""}${pending > 0 ? ` · ${pending} pending` : ""}`}
          action={
            <Button
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setShowCreate(true)}
            >
              New Return
            </Button>
          }
        />

        {/* Status filter tabs */}
        <div className="flex gap-1 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === f.value
                  ? "bg-neutral-900 text-white"
                  : "bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              {f.label}
              {f.value === "pending" && pending > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-warning-500 text-white text-[9px] font-bold">
                  {pending}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : returns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center mb-4">
              <RotateCcw className="w-7 h-7 text-neutral-300" />
            </div>
            <p className="text-sm font-medium text-neutral-700 mb-1">
              {statusFilter ? `No ${statusFilter} returns` : "No return requests yet"}
            </p>
            {!statusFilter && (
              <p className="text-xs text-neutral-400 mb-4 max-w-xs">
                Log a return request to track refunds and resolutions against orders.
              </p>
            )}
            {!statusFilter && (
              <Button
                size="sm"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => setShowCreate(true)}
              >
                New Return
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {returns.map((rr) => (
              <ReturnRow
                key={rr.id}
                rr={rr}
                onAction={handleActionClick}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <Modal title="New Return Request" onClose={() => setShowCreate(false)}>
          <CreateReturnForm
            onSubmit={handleCreated}
            onCancel={() => setShowCreate(false)}
          />
        </Modal>
      )}

      {/* Resolve modal */}
      {resolving && (
        <Modal
          title={
            resolving.target === "approved"
              ? "Approve Return"
              : resolving.target === "rejected"
              ? "Reject Return"
              : "Mark Completed"
          }
          onClose={() => setResolving(null)}
        >
          <ResolveModal
            returnReq={resolving.rr}
            targetStatus={resolving.target}
            onConfirm={handleResolved}
            onCancel={() => setResolving(null)}
          />
        </Modal>
      )}
    </>
  );
}
