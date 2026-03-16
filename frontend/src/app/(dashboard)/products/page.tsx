"use client";

import { Package } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";

export default function ProductsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        subtitle="Product catalog and cost management"
      />
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mb-4">
          <Package className="w-8 h-8 text-neutral-400" />
        </div>
        <h3 className="text-base font-semibold text-neutral-900 mb-1">
          Products — Coming Soon
        </h3>
        <p className="text-sm text-neutral-500 max-w-sm">
          Product catalog management, per-product cost tracking, and
          profit analysis will be available in Phase 2.
        </p>
      </div>
    </div>
  );
}
