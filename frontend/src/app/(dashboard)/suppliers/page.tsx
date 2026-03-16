"use client";

import { useState } from "react";
import { Truck, Search } from "lucide-react";
import useSWR from "swr";
import { PageHeader } from "@/components/layout/PageHeader";
import { SupplierScoreCard } from "@/components/suppliers/SupplierScoreCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { getSupplierPerformance } from "@/lib/api/suppliers";
import type { SupplierPerformance } from "@/types/api";

type SortField = "composite_score" | "on_time_rate" | "stock_accuracy" | "dispute_rate";

export default function SuppliersPage() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("composite_score");

  const { data: performances, isLoading } = useSWR<SupplierPerformance[]>(
    "/suppliers/performance",
    getSupplierPerformance,
    { revalidateOnFocus: false }
  );

  const filtered = (performances ?? [])
    .filter((p) =>
      search === "" ||
      p.supplier_name.toLowerCase().includes(search.toLowerCase()) ||
      p.country.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "dispute_rate") return a[sortBy] - b[sortBy];
      return b[sortBy] - a[sortBy];
    });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suppliers"
        subtitle="Performance scores and reliability metrics"
      />

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search suppliers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-base pl-9"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortField)}
          className="input-base w-auto text-sm"
        >
          <option value="composite_score">Sort by Score</option>
          <option value="on_time_rate">Sort by On-time Rate</option>
          <option value="stock_accuracy">Sort by Stock Accuracy</option>
          <option value="dispute_rate">Sort by Dispute Rate (lowest)</option>
        </select>
      </div>

      {/* Cards grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Truck className="w-10 h-10 text-neutral-300 mb-3" />
          <p className="text-sm font-medium text-neutral-500">
            {search ? "No suppliers match your search" : "No supplier data yet"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((perf) => (
            <SupplierScoreCard key={perf.supplier_id} performance={perf} />
          ))}
        </div>
      )}
    </div>
  );
}
