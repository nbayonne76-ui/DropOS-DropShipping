"use client";

import { format } from "date-fns";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/formatters";
import type { DateRange, DateRangePreset } from "@/types/analytics";
import { DATE_RANGE_PRESETS } from "@/lib/constants";

interface DateRangePickerProps {
  value: DateRange;
  preset: DateRangePreset;
  onPresetChange: (preset: DateRangePreset) => void;
  onRangeChange: (from: Date, to: Date) => void;
  className?: string;
}

export function DateRangePicker({
  value,
  preset,
  onPresetChange,
  onRangeChange,
  className,
}: DateRangePickerProps) {
  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      {/* Preset buttons */}
      <div className="flex items-center rounded-lg border border-neutral-200 bg-white overflow-hidden">
        {DATE_RANGE_PRESETS.filter((p) => p.value !== "custom").map((p) => (
          <button
            key={p.value}
            onClick={() => onPresetChange(p.value)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium transition-colors border-r border-neutral-200 last:border-r-0",
              preset === p.value
                ? "bg-primary-600 text-white"
                : "text-neutral-600 hover:bg-neutral-50"
            )}
          >
            {p.value === "7d" ? "7d" : p.value === "30d" ? "30d" : "90d"}
          </button>
        ))}
      </div>

      {/* Custom date inputs */}
      <div className="flex items-center gap-1.5 bg-white rounded-lg border border-neutral-200 px-3 py-1.5">
        <Calendar className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
        <input
          type="date"
          value={format(value.from, "yyyy-MM-dd")}
          max={format(value.to, "yyyy-MM-dd")}
          onChange={(e) => {
            if (e.target.value) {
              onRangeChange(new Date(e.target.value), value.to);
              onPresetChange("custom");
            }
          }}
          className="text-xs text-neutral-700 bg-transparent border-none outline-none"
        />
        <span className="text-neutral-300 text-xs">→</span>
        <input
          type="date"
          value={format(value.to, "yyyy-MM-dd")}
          min={format(value.from, "yyyy-MM-dd")}
          max={format(new Date(), "yyyy-MM-dd")}
          onChange={(e) => {
            if (e.target.value) {
              onRangeChange(value.from, new Date(e.target.value));
              onPresetChange("custom");
            }
          }}
          className="text-xs text-neutral-700 bg-transparent border-none outline-none"
        />
      </div>
    </div>
  );
}
