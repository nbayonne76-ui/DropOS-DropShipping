"use client";

import { useState, useEffect } from "react";
import {
  Plus, Pencil, Trash2, Search, Globe, Mail, Phone, Truck, X,
  TrendingUp, Package, ChevronRight,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { useSuppliers } from "@/hooks/useSuppliers";
import { getSupplierLinks, getSupplierPerformance } from "@/lib/api/suppliers";
import { formatCents, formatRelativeTime } from "@/lib/formatters";
import type {
  Supplier,
  CreateSupplierRequest,
  ProductSupplierLink,
  SupplierPerformanceSnapshot,
} from "@/types/api";

// ─── Supplier form (create / edit) ───────────────────────────────────────────

interface SupplierFormProps {
  initial?: Supplier;
  onSubmit: (data: CreateSupplierRequest) => Promise<void>;
  onCancel: () => void;
}

const EMPTY: CreateSupplierRequest = {
  name: "",
  contact_email: "",
  contact_phone: "",
  website: "",
  country: "",
  notes: "",
  api_endpoint: "",
};

function SupplierForm({ initial, onSubmit, onCancel }: SupplierFormProps) {
  const [form, setForm] = useState<CreateSupplierRequest>(
    initial
      ? {
          name: initial.name,
          contact_email: initial.contact_email ?? "",
          contact_phone: initial.contact_phone ?? "",
          website: initial.website ?? "",
          country: initial.country ?? "",
          notes: initial.notes ?? "",
          api_endpoint: initial.api_endpoint ?? "",
        }
      : EMPTY
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(field: keyof CreateSupplierRequest, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError(null);
    try {
      // Send null for empty optional fields
      const payload: CreateSupplierRequest = {
        name: form.name.trim(),
        contact_email: form.contact_email?.trim() || null,
        contact_phone: form.contact_phone?.trim() || null,
        website: form.website?.trim() || null,
        country: form.country?.toUpperCase().trim().slice(0, 2) || null,
        notes: form.notes?.trim() || null,
        api_endpoint: form.api_endpoint?.trim() || null,
      };
      await onSubmit(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="text-xs text-danger-600 bg-danger-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <div>
        <label className="block text-xs font-medium text-neutral-600 mb-1">
          Supplier Name <span className="text-danger-500">*</span>
        </label>
        <input
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g. Shenzhen Electronics Co."
          className="input-base w-full"
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-neutral-600 mb-1">Contact Email</label>
          <input
            type="email"
            value={form.contact_email ?? ""}
            onChange={(e) => set("contact_email", e.target.value)}
            placeholder="contact@supplier.com"
            className="input-base w-full"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-600 mb-1">Contact Phone</label>
          <input
            type="tel"
            value={form.contact_phone ?? ""}
            onChange={(e) => set("contact_phone", e.target.value)}
            placeholder="+86 123 456 7890"
            className="input-base w-full"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-neutral-600 mb-1">Website</label>
          <input
            type="url"
            value={form.website ?? ""}
            onChange={(e) => set("website", e.target.value)}
            placeholder="https://supplier.com"
            className="input-base w-full"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-600 mb-1">Country (ISO-2)</label>
          <input
            value={form.country ?? ""}
            onChange={(e) => set("country", e.target.value)}
            maxLength={2}
            placeholder="CN"
            className="input-base w-full uppercase"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-neutral-600 mb-1">Notes</label>
        <textarea
          value={form.notes ?? ""}
          onChange={(e) => set("notes", e.target.value)}
          rows={3}
          placeholder="Payment terms, lead times, special agreements…"
          className="input-base w-full resize-none"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-neutral-600 mb-1">
          API Endpoint <span className="text-neutral-400 font-normal">(optional, for automation)</span>
        </label>
        <input
          type="url"
          value={form.api_endpoint ?? ""}
          onChange={(e) => set("api_endpoint", e.target.value)}
          placeholder="https://api.supplier.com/orders"
          className="input-base w-full"
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={saving}>
          {initial ? "Save changes" : "Add supplier"}
        </Button>
      </div>
    </form>
  );
}

// ─── Modal wrapper ────────────────────────────────────────────────────────────

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
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Supplier card ────────────────────────────────────────────────────────────

interface SupplierCardProps {
  supplier: Supplier;
  onEdit: () => void;
  onDelete: () => void;
  onViewDetail: () => void;
  deleting: boolean;
}

function SupplierCard({ supplier, onEdit, onDelete, onViewDetail, deleting }: SupplierCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <button
          onClick={onViewDetail}
          className="min-w-0 text-left group"
        >
          <h3 className="text-sm font-semibold text-neutral-900 truncate group-hover:text-primary-600 transition-colors">
            {supplier.name}
          </h3>
          {supplier.country && (
            <Badge variant="neutral" className="mt-1">{supplier.country}</Badge>
          )}
        </button>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => { onDelete(); setConfirmDelete(false); }}
                disabled={deleting}
                className="px-2 py-1 rounded-lg text-xs font-medium text-white bg-danger-600 hover:bg-danger-700 disabled:opacity-50"
              >
                {deleting ? "…" : "Confirm"}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-2 py-1 rounded-lg text-xs text-neutral-500 hover:bg-neutral-100"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-danger-600 hover:bg-danger-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Contact details */}
      <div className="space-y-1.5">
        {supplier.contact_email && (
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <Mail className="w-3.5 h-3.5 flex-shrink-0 text-neutral-300" />
            <a href={`mailto:${supplier.contact_email}`} className="hover:text-primary-600 truncate">
              {supplier.contact_email}
            </a>
          </div>
        )}
        {supplier.contact_phone && (
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <Phone className="w-3.5 h-3.5 flex-shrink-0 text-neutral-300" />
            <span>{supplier.contact_phone}</span>
          </div>
        )}
        {supplier.website && (
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <Globe className="w-3.5 h-3.5 flex-shrink-0 text-neutral-300" />
            <a
              href={supplier.website}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary-600 truncate"
            >
              {supplier.website.replace(/^https?:\/\//, "")}
            </a>
          </div>
        )}
        {supplier.api_endpoint && (
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span className="w-3.5 h-3.5 flex-shrink-0 text-center text-neutral-300 font-mono text-[10px] leading-3.5">API</span>
            <span className="truncate font-mono text-[11px]">
              {supplier.api_endpoint.replace(/^https?:\/\//, "")}
            </span>
          </div>
        )}
      </div>

      {/* Notes */}
      {supplier.notes && (
        <p className="text-xs text-neutral-400 border-t border-neutral-50 pt-2 line-clamp-2">
          {supplier.notes}
        </p>
      )}
    </div>
  );
}

// ─── Supplier Detail Drawer ───────────────────────────────────────────────────

type DrawerTab = "performance" | "products";

function ScoreMeter({ label, value }: { label: string; value: number }) {
  const pct = Math.min(Math.max(value * 100, 0), 100);
  const color = pct >= 80 ? "bg-success-500" : pct >= 50 ? "bg-amber-400" : "bg-danger-500";
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-neutral-600">{label}</span>
        <span className="text-xs font-semibold text-neutral-900 tabular-nums">
          {pct.toFixed(1)}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-neutral-100 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SupplierDrawer({
  supplier,
  onClose,
}: {
  supplier: Supplier;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<DrawerTab>("performance");
  const [snapshots, setSnapshots] = useState<SupplierPerformanceSnapshot[]>([]);
  const [links, setLinks] = useState<ProductSupplierLink[]>([]);
  const [loadingPerf, setLoadingPerf] = useState(false);
  const [loadingLinks, setLoadingLinks] = useState(false);

  useEffect(() => {
    setLoadingPerf(true);
    getSupplierPerformance(supplier.id)
      .then(setSnapshots)
      .catch(() => {})
      .finally(() => setLoadingPerf(false));
    setLoadingLinks(true);
    getSupplierLinks(supplier.id)
      .then(setLinks)
      .catch(() => {})
      .finally(() => setLoadingLinks(false));
  }, [supplier.id]);

  const latest = snapshots[0] ?? null;
  const onTimeRate = latest && latest.total_orders > 0
    ? latest.on_time_deliveries / latest.total_orders
    : null;
  const defectRate = latest?.defect_rate ? parseFloat(latest.defect_rate) : null;
  const avgLead = latest?.avg_lead_time_days ? parseFloat(latest.avg_lead_time_days) : null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-neutral-900 truncate">{supplier.name}</h2>
            {supplier.country && (
              <span className="text-xs text-neutral-400">{supplier.country}</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-100 px-5 gap-4">
          {(["performance", "products"] as DrawerTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-3 text-xs font-medium capitalize border-b-2 transition-colors ${
                tab === t
                  ? "border-neutral-900 text-neutral-900"
                  : "border-transparent text-neutral-400 hover:text-neutral-700"
              }`}
            >
              {t === "performance" ? "Performance" : "Linked Products"}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* ── Performance tab ─── */}
          {tab === "performance" && (
            <>
              {loadingPerf ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 rounded-lg" />
                  ))}
                </div>
              ) : !latest ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <TrendingUp className="w-8 h-8 text-neutral-200 mb-3" />
                  <p className="text-sm text-neutral-500">No performance data yet</p>
                  <p className="text-xs text-neutral-400 mt-1 max-w-xs">
                    Scores are computed weekly once orders containing linked products exist.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-neutral-50 p-4">
                      <p className="text-xs text-neutral-500 mb-1">Orders (30 days)</p>
                      <p className="text-2xl font-bold text-neutral-900">{latest.total_orders}</p>
                    </div>
                    <div className="rounded-xl bg-neutral-50 p-4">
                      <p className="text-xs text-neutral-500 mb-1">Avg. Lead Time</p>
                      <p className="text-2xl font-bold text-neutral-900">
                        {avgLead != null ? `${avgLead.toFixed(1)}d` : "—"}
                      </p>
                    </div>
                  </div>

                  {/* Score bars */}
                  <div className="space-y-4">
                    <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                      Scores
                    </p>
                    {onTimeRate != null && (
                      <ScoreMeter label="On-time delivery rate" value={onTimeRate} />
                    )}
                    {defectRate != null && (
                      <ScoreMeter label="Quality (1 − defect rate)" value={1 - defectRate} />
                    )}
                  </div>

                  {/* Total COGS */}
                  <div className="rounded-xl border border-neutral-100 p-4">
                    <p className="text-xs text-neutral-500 mb-1">Total COGS (30 days)</p>
                    <p className="text-lg font-bold text-neutral-900">
                      {formatCents(latest.total_cogs_cents)}
                    </p>
                  </div>

                  {/* History */}
                  {snapshots.length > 1 && (
                    <div>
                      <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
                        History
                      </p>
                      <div className="divide-y divide-neutral-100">
                        {snapshots.map((s) => (
                          <div key={s.id} className="flex items-center justify-between py-2">
                            <span className="text-xs text-neutral-500">
                              {s.period_start.slice(0, 10)}
                            </span>
                            <span className="text-xs text-neutral-700">
                              {s.total_orders} orders
                            </span>
                            <span className="text-xs font-medium text-neutral-900">
                              {formatCents(s.total_cogs_cents)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── Linked Products tab ─── */}
          {tab === "products" && (
            <>
              {loadingLinks ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 rounded-lg" />
                  ))}
                </div>
              ) : links.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Package className="w-8 h-8 text-neutral-200 mb-3" />
                  <p className="text-sm text-neutral-500">No products linked</p>
                  <p className="text-xs text-neutral-400 mt-1 max-w-xs">
                    Link Shopify product variants to this supplier via the API or product page.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {links.map((link) => (
                    <div key={link.id} className="py-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-neutral-900 truncate">
                          {link.shopify_variant_id
                            ? `Variant: ${link.shopify_variant_id}`
                            : `Product: ${link.shopify_product_id}`}
                        </p>
                        {link.supplier_sku && (
                          <p className="text-xs text-neutral-400 font-mono">
                            Supplier SKU: {link.supplier_sku}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-semibold text-neutral-900">
                          {formatCents(link.unit_cost_cents)}
                        </p>
                        {link.lead_time_days != null && (
                          <p className="text-xs text-neutral-400">
                            {link.lead_time_days}d lead time
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-100 px-5 py-3 flex items-center justify-between text-xs text-neutral-400">
          <span>Created {formatRelativeTime(supplier.created_at)}</span>
          <a
            href={`/purchase-orders?supplier_id=${supplier.id}`}
            className="text-primary-600 hover:underline flex items-center gap-1"
          >
            View Purchase Orders <ChevronRight className="w-3 h-3" />
          </a>
        </div>
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type ModalState =
  | { type: "none" }
  | { type: "create" }
  | { type: "edit"; supplier: Supplier };

export default function SuppliersPage() {
  const { suppliers, isLoading, create, update, remove } = useSuppliers();
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [drawerSupplier, setDrawerSupplier] = useState<Supplier | null>(null);

  const filtered = suppliers.filter(
    (s) =>
      search === "" ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.country?.toLowerCase().includes(search.toLowerCase()) ||
      s.contact_email?.toLowerCase().includes(search.toLowerCase())
  );

  async function handleCreate(data: CreateSupplierRequest) {
    await create(data);
    setModal({ type: "none" });
  }

  async function handleEdit(supplier: Supplier, data: CreateSupplierRequest) {
    await update(supplier.id, data);
    setModal({ type: "none" });
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await remove(id);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Suppliers"
          subtitle={`${suppliers.length} supplier${suppliers.length !== 1 ? "s" : ""}`}
          action={
            <Button
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setModal({ type: "create" })}
            >
              Add supplier
            </Button>
          }
        />

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search suppliers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-base w-full pl-9"
          />
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center mb-4">
              <Truck className="w-7 h-7 text-neutral-300" />
            </div>
            <p className="text-sm font-medium text-neutral-700 mb-1">
              {search ? `No suppliers match "${search}"` : "No suppliers yet"}
            </p>
            {!search && (
              <p className="text-xs text-neutral-400 mb-4 max-w-xs">
                Add your first supplier to start tracking costs and performance.
              </p>
            )}
            {!search && (
              <Button
                size="sm"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => setModal({ type: "create" })}
              >
                Add supplier
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((supplier) => (
              <SupplierCard
                key={supplier.id}
                supplier={supplier}
                onEdit={() => setModal({ type: "edit", supplier })}
                onDelete={() => handleDelete(supplier.id)}
                onViewDetail={() => setDrawerSupplier(supplier)}
                deleting={deletingId === supplier.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      {modal.type === "create" && (
        <Modal title="Add Supplier" onClose={() => setModal({ type: "none" })}>
          <SupplierForm
            onSubmit={handleCreate}
            onCancel={() => setModal({ type: "none" })}
          />
        </Modal>
      )}

      {/* Edit modal */}
      {modal.type === "edit" && (
        <Modal title="Edit Supplier" onClose={() => setModal({ type: "none" })}>
          <SupplierForm
            initial={modal.supplier}
            onSubmit={(data) => handleEdit(modal.supplier, data)}
            onCancel={() => setModal({ type: "none" })}
          />
        </Modal>
      )}

      {/* Detail drawer */}
      {drawerSupplier && (
        <SupplierDrawer
          supplier={drawerSupplier}
          onClose={() => setDrawerSupplier(null)}
        />
      )}
    </>
  );
}
