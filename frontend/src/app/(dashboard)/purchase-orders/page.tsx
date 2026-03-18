"use client";

import { useState, useEffect } from "react";
import { Plus, X, Package, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { useSuppliers } from "@/hooks/useSuppliers";
import {
  listPurchaseOrders,
  createPurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder,
} from "@/lib/api/purchaseOrders";
import { formatCents, formatRelativeTime } from "@/lib/formatters";
import type { PurchaseOrder, POStatus, POItemRequest, Supplier } from "@/types/api";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: "All", value: "" },
  { label: "Draft", value: "draft" },
  { label: "Sent", value: "sent" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Received", value: "received" },
  { label: "Cancelled", value: "cancelled" },
];

const STATUS_VARIANT: Record<POStatus, "neutral" | "info" | "warning" | "success" | "danger"> = {
  draft: "neutral",
  sent: "info",
  confirmed: "warning",
  received: "success",
  cancelled: "danger",
};

const NEXT_ACTION: Record<POStatus, { label: string; status: POStatus } | null> = {
  draft: { label: "Mark Sent", status: "sent" },
  sent: { label: "Confirm", status: "confirmed" },
  confirmed: { label: "Mark Received", status: "received" },
  received: null,
  cancelled: null,
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

// ─── Create PO Form ───────────────────────────────────────────────────────────

const EMPTY_ITEM: POItemRequest = {
  title: "",
  sku: "",
  quantity: 1,
  unit_cost_cents: 0,
};

function CreatePOForm({
  suppliers,
  onSubmit,
  onCancel,
}: {
  suppliers: Supplier[];
  onSubmit: (po: PurchaseOrder) => void;
  onCancel: () => void;
}) {
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [items, setItems] = useState<POItemRequest[]>([{ ...EMPTY_ITEM }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addItem() {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: keyof POItemRequest, value: string | number) {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supplierId) { setError("Select a supplier"); return; }
    if (items.some((it) => !it.title.trim())) { setError("All line items need a title"); return; }
    setSaving(true);
    setError(null);
    try {
      const po = await createPurchaseOrder({
        supplier_id: supplierId,
        reference: reference.trim() || null,
        notes: notes.trim() || null,
        expected_delivery_date: expectedDate || null,
        items: items.map((it) => ({
          title: it.title.trim(),
          sku: it.sku?.trim() || null,
          quantity: Number(it.quantity),
          unit_cost_cents: Math.round(Number(it.unit_cost_cents) * 100),
        })),
      });
      onSubmit(po);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create PO");
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
          <label className="label-base">Supplier <span className="text-danger-500">*</span></label>
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="input-base"
            required
          >
            <option value="">Select supplier…</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label-base">PO Reference</label>
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. PO-2026-001"
            className="input-base"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label-base">Expected Delivery</label>
          <input
            type="date"
            value={expectedDate}
            onChange={(e) => setExpectedDate(e.target.value)}
            className="input-base"
          />
        </div>
        <div>
          <label className="label-base">Notes</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes…"
            className="input-base"
          />
        </div>
      </div>

      {/* Line items */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-neutral-700 uppercase tracking-wide">
            Line Items
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
              <div className="col-span-4">
                {idx === 0 && <p className="text-[10px] text-neutral-400 mb-1">Title *</p>}
                <input
                  value={item.title}
                  onChange={(e) => updateItem(idx, "title", e.target.value)}
                  placeholder="Product name"
                  className="input-base text-xs"
                  required
                />
              </div>
              <div className="col-span-2">
                {idx === 0 && <p className="text-[10px] text-neutral-400 mb-1">SKU</p>}
                <input
                  value={item.sku ?? ""}
                  onChange={(e) => updateItem(idx, "sku", e.target.value)}
                  placeholder="SKU"
                  className="input-base text-xs"
                />
              </div>
              <div className="col-span-2">
                {idx === 0 && <p className="text-[10px] text-neutral-400 mb-1">Qty *</p>}
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                  className="input-base text-xs"
                  required
                />
              </div>
              <div className="col-span-3">
                {idx === 0 && <p className="text-[10px] text-neutral-400 mb-1">Unit Cost ($)</p>}
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={item.unit_cost_cents === 0 ? "" : item.unit_cost_cents}
                  onChange={(e) => updateItem(idx, "unit_cost_cents", e.target.value)}
                  placeholder="0.00"
                  className="input-base text-xs"
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
        <Button type="submit" size="sm" loading={saving}>Create PO</Button>
      </div>
    </form>
  );
}

// ─── PO Row ───────────────────────────────────────────────────────────────────

function PORow({
  po,
  onTransition,
  onCancel,
  onDelete,
}: {
  po: PurchaseOrder;
  onTransition: (po: PurchaseOrder, nextStatus: POStatus) => void;
  onCancel: (po: PurchaseOrder) => void;
  onDelete: (po: PurchaseOrder) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const nextAction = NEXT_ACTION[po.status];

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
              {po.reference || <span className="text-neutral-400 italic">No reference</span>}
            </p>
            <p className="text-xs text-neutral-400 truncate">{po.supplier_name}</p>
          </div>
          <div>
            <Badge variant={STATUS_VARIANT[po.status]}>{po.status}</Badge>
          </div>
          <div className="hidden sm:block">
            <p className="text-xs text-neutral-500">
              {po.items.length} item{po.items.length !== 1 ? "s" : ""}
            </p>
            <p className="text-xs font-medium text-neutral-900 tabular-nums">
              {formatCents(po.total_cost_cents)}
            </p>
          </div>
          <div className="hidden sm:block">
            <p className="text-xs text-neutral-400">
              {po.expected_delivery_date
                ? `Due ${po.expected_delivery_date}`
                : "No due date"}
            </p>
            <p className="text-xs text-neutral-400">{formatRelativeTime(po.created_at)}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {nextAction && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onTransition(po, nextAction.status)}
            >
              {nextAction.label}
            </Button>
          )}
          {po.status !== "received" && po.status !== "cancelled" && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onCancel(po)}
              className="text-danger-500 hover:text-danger-700 hover:bg-danger-50"
            >
              Cancel
            </Button>
          )}
          {(po.status === "draft" || po.status === "cancelled") && (
            <button
              onClick={() => onDelete(po)}
              className="p-1.5 rounded-lg text-neutral-300 hover:text-danger-500 hover:bg-danger-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Expanded items */}
      {expanded && (
        <div className="border-t border-neutral-100 bg-neutral-50 px-4 py-3">
          {po.notes && (
            <p className="text-xs text-neutral-500 mb-3 italic">{po.notes}</p>
          )}
          <table className="w-full text-xs">
            <thead>
              <tr className="text-neutral-400 uppercase tracking-wide">
                <th className="text-left pb-1.5 font-semibold">Item</th>
                <th className="text-left pb-1.5 font-semibold">SKU</th>
                <th className="text-right pb-1.5 font-semibold">Qty</th>
                <th className="text-right pb-1.5 font-semibold">Unit Cost</th>
                <th className="text-right pb-1.5 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {po.items.map((item) => (
                <tr key={item.id}>
                  <td className="py-1.5 text-neutral-800 font-medium">{item.title}</td>
                  <td className="py-1.5 text-neutral-400 font-mono">{item.sku ?? "—"}</td>
                  <td className="py-1.5 text-right tabular-nums text-neutral-700">{item.quantity}</td>
                  <td className="py-1.5 text-right tabular-nums text-neutral-700">
                    {formatCents(item.unit_cost_cents)}
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-neutral-900 font-medium">
                    {formatCents(item.total_cents)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-neutral-200">
                <td colSpan={4} className="pt-2 text-right text-xs font-semibold text-neutral-700">
                  Total
                </td>
                <td className="pt-2 text-right tabular-nums text-sm font-bold text-neutral-900">
                  {formatCents(po.total_cost_cents)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PurchaseOrdersPage() {
  const { suppliers } = useSuppliers();
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    setLoading(true);
    listPurchaseOrders({ status: statusFilter || undefined })
      .then(setPos)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [statusFilter]);

  function handleCreated(po: PurchaseOrder) {
    setPos((prev) => [po, ...prev]);
    setShowCreate(false);
  }

  async function handleTransition(po: PurchaseOrder, nextStatus: POStatus) {
    try {
      const updated = await updatePurchaseOrder(po.id, { status: nextStatus });
      setPos((prev) => prev.map((p) => (p.id === po.id ? updated : p)));
    } catch { /* ignore */ }
  }

  async function handleCancel(po: PurchaseOrder) {
    try {
      const updated = await updatePurchaseOrder(po.id, { status: "cancelled" });
      setPos((prev) => prev.map((p) => (p.id === po.id ? updated : p)));
    } catch { /* ignore */ }
  }

  async function handleDelete(po: PurchaseOrder) {
    try {
      await deletePurchaseOrder(po.id);
      setPos((prev) => prev.filter((p) => p.id !== po.id));
    } catch { /* ignore */ }
  }

  const filtered = statusFilter ? pos.filter((p) => p.status === statusFilter) : pos;

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Purchase Orders"
          subtitle={`${pos.length} order${pos.length !== 1 ? "s" : ""}`}
          action={
            <Button
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setShowCreate(true)}
            >
              New PO
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
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center mb-4">
              <Package className="w-7 h-7 text-neutral-300" />
            </div>
            <p className="text-sm font-medium text-neutral-700 mb-1">
              {statusFilter ? `No ${statusFilter} purchase orders` : "No purchase orders yet"}
            </p>
            {!statusFilter && (
              <p className="text-xs text-neutral-400 mb-4 max-w-xs">
                Create your first purchase order to start tracking supplier orders and inventory.
              </p>
            )}
            {!statusFilter && (
              <Button
                size="sm"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => setShowCreate(true)}
              >
                New PO
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((po) => (
              <PORow
                key={po.id}
                po={po}
                onTransition={handleTransition}
                onCancel={handleCancel}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <Modal title="New Purchase Order" onClose={() => setShowCreate(false)}>
          <CreatePOForm
            suppliers={suppliers}
            onSubmit={handleCreated}
            onCancel={() => setShowCreate(false)}
          />
        </Modal>
      )}
    </>
  );
}
