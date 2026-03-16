import { useState, useCallback } from "react";
import { subDays } from "date-fns";
import type { DateRange, DateRangePreset } from "@/types/analytics";
import { useAppStore } from "@/store/appStore";

interface UseDateRangeResult {
  range: DateRange;
  preset: DateRangePreset;
  setPreset: (preset: DateRangePreset) => void;
  setCustomRange: (from: Date, to: Date) => void;
  applyPreset: (days: number) => void;
}

export function useDateRange(): UseDateRangeResult {
  const { dateRange, setDateRange } = useAppStore((s) => ({
    dateRange: s.dateRange,
    setDateRange: s.setDateRange,
  }));

  const [preset, setPresetState] = useState<DateRangePreset>("30d");

  const applyPreset = useCallback(
    (days: number) => {
      const to = new Date();
      const from = subDays(to, days);
      setDateRange({ from, to });
    },
    [setDateRange]
  );

  const setPreset = useCallback(
    (p: DateRangePreset) => {
      setPresetState(p);
      if (p === "7d") applyPreset(7);
      else if (p === "30d") applyPreset(30);
      else if (p === "90d") applyPreset(90);
      // "custom" — wait for explicit range
    },
    [applyPreset]
  );

  const setCustomRange = useCallback(
    (from: Date, to: Date) => {
      setPresetState("custom");
      setDateRange({ from, to });
    },
    [setDateRange]
  );

  return {
    range: dateRange,
    preset,
    setPreset,
    setCustomRange,
    applyPreset,
  };
}
