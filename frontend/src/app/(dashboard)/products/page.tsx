"use client";

import { useState, useMemo, useRef } from "react";
import { ChevronDown, ChevronRight, Pencil, Check, X, Search, Upload } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useProducts } from "@/hooks/useProducts";
import { useStores } from "@/hooks/useStores";
import { useAppStore } from "@/store/appStore";
import { bulkImportCogs } from "@/lib/api/products";
import { downloadBlob, cn, formatCents, formatNumber } from "@/lib/formatters";
import type { BulkCogsImportResult, Product, ProductVariant } from "@/types/api";

// ─── Status badge helper ──────────────────────────────────────────────────────

function productStatusVariant(status: string): "success" | "neutral" | "warning" {
  if (status === "active") return "success";
  if (status === "draft") return "warning";
  return "neutral";
}

// ─── Variant sub-table ────────────────────────────────────────────────────────

function VariantsTable({ variants, currency }: { variants: ProductVariant[]; currency?: string }) {
  return (
    <table className="min-w-full text-xs">
      <thead>
        <tr className="border-b border-neutral-100">
          <th className="pb-2 text-left font-semibold text-neutral-400 uppercase tracking-wide">Variant</th>
          <th className="pb-2 text-left font-semibold text-neutral-400 uppercase tracking-wide">SKU</th>
          <th className="pb-2 text-right font-semibold text-neutral-400 uppercase tracking-wide">Price</th>
          <th className="pb-2 text-right font-semibold text-neutral-400 uppercase tracking-wide">Stock</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-neutral-50">
        {variants.map((v) => (
          <tr key={v.id} className="hover:bg-neutral-50/50">
            <td className="py-2 text-neutral-700 font-medium">{v.title}</td>
            <td className="py-2 text-neutral-400 font-mono">{v.sku ?? "—"}</td>
            <td className="py-2 text-right text-neutral-800 tabular-nums">
              {formatCents(v.price_cents, currency)}
            </td>
            <td className="py-2 text-right tabular-nums">
              <span className="inline-flex items-center gap-1.5">
                <span className={cn(
                  "font-medium tabular-nums",
                  v.inventory_quantity === 0 ? "text-danger-600" : "text-neutral-700"
                )}>
                  {formatNumber(v.inventory_quantity)}
                </span>
                {v.inventory_quantity === 0 && (
                  <Badge variant="danger">Out</Badge>
                )}
                {v.inventory_quantity > 0 && v.inventory_quantity <= 5 && (
                  <Badge variant="warning">Low</Badge>
                )}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Inline HS code / origin editor ──────────────────────────────────────────

interface EditTradeFieldsProps {
  product: Product;
  onSave: (hs_code: string | null, origin_country: string | null) => Promise<void>;
  onCancel: () => void;
}

function EditTradeFields({ product, onSave, onCancel }: EditTradeFieldsProps) {
  const [hs, setHs] = useState(product.hs_code ?? "");
  const [origin, setOrigin] = useState(product.origin_country ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await onSave(hs || null, origin.toUpperCase() || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex flex-col gap-0.5">
        <label className="text-xs text-neutral-400">HS Code</label>
        <input
          value={hs}
          onChange={(e) => setHs(e.target.value)}
          placeholder="e.g. 9403.20"
          className="w-28 rounded border border-primary-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>
      <div className="flex flex-col gap-0.5">
        <label className="text-xs text-neutral-400">Origin (ISO-2)</label>
        <input
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          maxLength={2}
          placeholder="CN"
          className="w-14 rounded border border-primary-300 px-2 py-1 text-xs uppercase focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>
      {error && <span className="text-xs text-danger-600">{error}</span>}
      <div className="flex items-center gap-1 mt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="p-1.5 rounded bg-success-50 text-success-600 hover:bg-success-100 disabled:opacity-50"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="p-1.5 rounded bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Product row ──────────────────────────────────────────────────────────────

interface ProductRowProps {
  product: Product;
  currency?: string;
  onUpdate: (id: string, data: { hs_code?: string | null; origin_country?: string | null }) => Promise<Product>;
}

function ProductRow({ product, currency, onUpdate }: ProductRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);

  const minPrice = Math.min(...product.variants.map((v) => v.price_cents));
  const maxPrice = Math.max(...product.variants.map((v) => v.price_cents));
  const totalStock = product.variants.reduce((s, v) => s + v.inventory_quantity, 0);
  const priceLabel =
    product.variants.length === 0
      ? "—"
      : minPrice === maxPrice
      ? formatCents(minPrice, currency)
      : `${formatCents(minPrice, currency)} – ${formatCents(maxPrice, currency)}`;

  async function handleSaveTradeFields(hs_code: string | null, origin_country: string | null) {
    await onUpdate(product.id, { hs_code, origin_country });
    setEditing(false);
  }

  return (
    <>
      <tr
        className="hover:bg-neutral-50/30 cursor-pointer transition-colors"
        onClick={() => !editing && setExpanded((e) => !e)}
      >
        {/* Expand toggle */}
        <td className="py-3 pl-4 pr-2 w-8">
          {product.variants.length > 0 ? (
            expanded ? (
              <ChevronDown className="w-4 h-4 text-neutral-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            )
          ) : null}
        </td>

        {/* Title + vendor */}
        <td className="py-3 pr-4">
          <p className="text-sm font-medium text-neutral-900">{product.title}</p>
          {product.vendor && (
            <p className="text-xs text-neutral-400">{product.vendor}</p>
          )}
        </td>

        {/* Type */}
        <td className="py-3 pr-4 hidden md:table-cell">
          <span className="text-sm text-neutral-500">
            {product.product_type ?? "—"}
          </span>
        </td>

        {/* Status */}
        <td className="py-3 pr-4">
          <Badge variant={productStatusVariant(product.status)}>
            {product.status}
          </Badge>
        </td>

        {/* Variants */}
        <td className="py-3 pr-4 text-sm text-neutral-600 tabular-nums text-right hidden sm:table-cell">
          {product.variants.length}
        </td>

        {/* Price range */}
        <td className="py-3 pr-4 text-sm text-neutral-800 tabular-nums text-right hidden lg:table-cell">
          {priceLabel}
        </td>

        {/* Stock */}
        <td className="py-3 pr-4 text-right hidden sm:table-cell">
          <div className="inline-flex items-center gap-1.5 justify-end">
            <span className={cn(
              "text-sm font-medium tabular-nums",
              totalStock === 0 ? "text-danger-600" : totalStock <= 5 ? "text-warning-600" : "text-neutral-700"
            )}>
              {formatNumber(totalStock)}
            </span>
            {totalStock === 0 && (
              <Badge variant="danger">Out</Badge>
            )}
            {totalStock > 0 && totalStock <= 5 && (
              <Badge variant="warning">Low</Badge>
            )}
          </div>
        </td>

        {/* Trade fields */}
        <td className="py-3 pr-4 hidden xl:table-cell" onClick={(e) => e.stopPropagation()}>
          {editing ? (
            <EditTradeFields
              product={product}
              onSave={handleSaveTradeFields}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-500 font-mono">
                {product.hs_code ?? <span className="text-neutral-300">No HS code</span>}
              </span>
              {product.origin_country && (
                <span className="text-xs bg-neutral-100 text-neutral-600 rounded px-1.5 py-0.5 font-medium">
                  {product.origin_country}
                </span>
              )}
              <button
                onClick={() => setEditing(true)}
                className="p-1 text-neutral-300 hover:text-neutral-600 hover:bg-neutral-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Pencil className="w-3 h-3" />
              </button>
            </div>
          )}
        </td>
      </tr>

      {/* Expanded variants */}
      {expanded && product.variants.length > 0 && (
        <tr>
          <td colSpan={8} className="bg-neutral-50 px-8 py-3 border-b border-neutral-100">
            <VariantsTable variants={product.variants} currency={currency} />
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Bulk COGS import modal ───────────────────────────────────────────────────

const COGS_TEMPLATE = "sku,unit_cogs_cents\nexample-sku-1,1500\nexample-sku-2,2000\n";

interface BulkCogsModalProps {
  onClose: () => void;
}

function BulkCogsModal({ onClose }: BulkCogsModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<BulkCogsImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleTemplateDownload() {
    const blob = new Blob([COGS_TEMPLATE], { type: "text/csv" });
    downloadBlob(blob, "cogs-template.csv");
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const res = await bulkImportCogs(file);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">Import COGS from CSV</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Upload a CSV with <code className="font-mono bg-neutral-100 px-1 rounded">sku,unit_cogs_cents</code> columns
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Template download */}
          <div className="flex items-center justify-between bg-neutral-50 rounded-xl px-4 py-3 border border-neutral-200">
            <div>
              <p className="text-sm font-medium text-neutral-700">Download template</p>
              <p className="text-xs text-neutral-400">CSV with the required columns</p>
            </div>
            <Button variant="secondary" size="sm" onClick={handleTemplateDownload}>
              Download
            </Button>
          </div>

          {/* File picker */}
          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-neutral-200 rounded-xl py-6 text-sm text-neutral-500 hover:border-primary-300 hover:text-primary-600 transition-colors"
            >
              <Upload className="w-5 h-5" />
              {file ? (
                <span className="font-medium text-neutral-800">{file.name}</span>
              ) : (
                <span>Click to select CSV file</span>
              )}
            </button>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-danger-600 bg-danger-50 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Result */}
          {result && (
            <div className="bg-success-50 rounded-xl px-4 py-3 border border-success-200 space-y-1">
              <p className="text-sm font-semibold text-success-700">Import complete</p>
              <p className="text-xs text-success-600">
                {result.updated} line item{result.updated !== 1 ? "s" : ""} updated ·{" "}
                {result.orders_recalculated} order{result.orders_recalculated !== 1 ? "s" : ""} recalculated
              </p>
              {result.not_found_skus.length > 0 && (
                <p className="text-xs text-warning-600">
                  {result.not_found_skus.length} SKU{result.not_found_skus.length !== 1 ? "s" : ""} not found:{" "}
                  {result.not_found_skus.slice(0, 5).join(", ")}
                  {result.not_found_skus.length > 5 ? "…" : ""}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-neutral-100">
          <Button variant="ghost" size="sm" onClick={onClose}>
            {result ? "Close" : "Cancel"}
          </Button>
          {!result && (
            <Button size="sm" loading={uploading} disabled={!file} onClick={handleUpload}>
              Import
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const activeStoreId = useAppStore((s) => s.activeStoreId);
  const { stores } = useStores();

  const [storeFilter, setStoreFilter] = useState<string>(activeStoreId ?? "");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showImportModal, setShowImportModal] = useState(false);

  const { products, total, totalPages, isLoading, update } = useProducts({
    store_id: storeFilter || undefined,
    page,
    page_size: 50,
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.vendor?.toLowerCase().includes(q) ||
        p.product_type?.toLowerCase().includes(q) ||
        p.variants.some((v) => v.sku?.toLowerCase().includes(q))
    );
  }, [products, search]);

  const activeCurrency = stores.find((s) => s.id === storeFilter)?.currency;

  return (
    <div className="space-y-6">
      {showImportModal && (
        <BulkCogsModal onClose={() => setShowImportModal(false)} />
      )}

      <PageHeader
        title="Products"
        subtitle={`${formatNumber(total)} product${total !== 1 ? "s" : ""} synced from Shopify`}
        action={
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Upload className="w-3.5 h-3.5" />}
            onClick={() => setShowImportModal(true)}
          >
            Import COGS
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by title, vendor, SKU…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400"
          />
        </div>

        {/* Store filter */}
        {stores.length > 1 && (
          <select
            value={storeFilter}
            onChange={(e) => { setStoreFilter(e.target.value); setPage(1); }}
            className="text-sm border border-neutral-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          >
            <option value="">All stores</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Table */}
      <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50">
                <th className="w-8 pl-4" />
                <th className="pb-3 pt-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide pr-4">
                  Product
                </th>
                <th className="pb-3 pt-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide pr-4 hidden md:table-cell">
                  Type
                </th>
                <th className="pb-3 pt-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide pr-4">
                  Status
                </th>
                <th className="pb-3 pt-3 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wide pr-4 hidden sm:table-cell">
                  Variants
                </th>
                <th className="pb-3 pt-3 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wide pr-4 hidden lg:table-cell">
                  Price
                </th>
                <th className="pb-3 pt-3 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wide pr-4 hidden sm:table-cell">
                  Stock
                </th>
                <th className="pb-3 pt-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide pr-4 hidden xl:table-cell">
                  HS Code / Origin
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      <td className="py-3 pl-4 pr-2"><Skeleton className="h-4 w-4" /></td>
                      <td className="py-3 pr-4"><Skeleton className="h-4 w-48" /></td>
                      <td className="py-3 pr-4 hidden md:table-cell"><Skeleton className="h-4 w-24" /></td>
                      <td className="py-3 pr-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                      <td className="py-3 pr-4 hidden sm:table-cell"><Skeleton className="h-4 w-8 ml-auto" /></td>
                      <td className="py-3 pr-4 hidden lg:table-cell"><Skeleton className="h-4 w-20 ml-auto" /></td>
                      <td className="py-3 pr-4 hidden sm:table-cell"><Skeleton className="h-4 w-12 ml-auto" /></td>
                      <td className="py-3 pr-4 hidden xl:table-cell"><Skeleton className="h-4 w-32" /></td>
                    </tr>
                  ))
                : filtered.length === 0
                ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-sm text-neutral-400">
                        {search ? `No products match "${search}"` : "No products found. Sync your Shopify store to import products."}
                      </td>
                    </tr>
                  )
                : filtered.map((product) => (
                    <ProductRow
                      key={product.id}
                      product={product}
                      currency={activeCurrency}
                      onUpdate={update}
                    />
                  ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-100 bg-neutral-50">
            <p className="text-xs text-neutral-500">
              Page {page} of {totalPages} · {formatNumber(total)} products
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-xs rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
