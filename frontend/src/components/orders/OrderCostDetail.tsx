"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Pencil, Check, X } from "lucide-react";
import { cn, formatCents } from "@/lib/formatters";
import { COST_LAYER_LABELS, COST_LAYER_COLORS } from "@/lib/constants";
import { updateOrderCosts } from "@/lib/api/orders";
import type { Order, UpdateOrderCostsRequest } from "@/types/api";

interface OrderCostDetailProps {
  order: Order;
  onUpdate?: (updated: Order) => void;
  defaultExpanded?: boolean;
}

const EDITABLE_COST_KEYS: (keyof UpdateOrderCostsRequest)[] = [
  "cogs",
  "shipping_cost",
  "platform_fee",
  "payment_fee",
  "chargeback_fee",
  "refund_fee",
  "fx_loss",
  "import_duty",
];

export function OrderCostDetail({
  order,
  onUpdate,
  defaultExpanded = false,
}: OrderCostDetailProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit(key: string, currentCents: number) {
    setEditingKey(key);
    setEditValue((currentCents / 100).toFixed(2));
    setError(null);
  }

  function cancelEdit() {
    setEditingKey(null);
    setEditValue("");
    setError(null);
  }

  async function saveEdit(key: keyof UpdateOrderCostsRequest) {
    const cents = Math.round(parseFloat(editValue) * 100);
    if (isNaN(cents)) {
      setError("Invalid amount");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await updateOrderCosts(order.id, { [key]: cents });
      onUpdate?.(updated);
      setEditingKey(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const totalCost = EDITABLE_COST_KEYS.reduce(
    (sum, k) => sum + (order[k as keyof Order] as number ?? 0),
    0
  );

  return (
    <div className="border border-neutral-200 rounded-xl overflow-hidden">
      {/* Header toggle */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-4 py-3 bg-neutral-50 hover:bg-neutral-100 transition-colors text-left"
      >
        <span className="text-sm font-semibold text-neutral-700">
          Cost Breakdown
        </span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-neutral-500 tabular-nums">
            Total costs: {formatCents(totalCost, order.currency)}
          </span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-neutral-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-neutral-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 py-3 bg-white">
          {error && (
            <p className="mb-3 text-xs text-danger-600 bg-danger-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="pb-2 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                  Layer
                </th>
                <th className="pb-2 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                  Amount
                </th>
                <th className="pb-2 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {EDITABLE_COST_KEYS.map((key) => {
                const amount = order[key as keyof Order] as number ?? 0;
                const isEditing = editingKey === key;
                const color = COST_LAYER_COLORS[key] ?? "#94a3b8";

                return (
                  <tr key={key} className="hover:bg-neutral-50/50">
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-neutral-700">
                          {COST_LAYER_LABELS[key] ?? key}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-neutral-500">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-24 rounded border border-primary-300 px-2 py-0.5 text-right text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                            autoFocus
                          />
                        </div>
                      ) : (
                        <span className="font-medium text-neutral-800 tabular-nums">
                          {formatCents(amount, order.currency)}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => saveEdit(key)}
                              disabled={saving}
                              className="p-1 text-success-600 hover:bg-success-50 rounded"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              disabled={saving}
                              className="p-1 text-neutral-400 hover:bg-neutral-100 rounded"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => startEdit(key, amount)}
                            className="p-1 text-neutral-300 hover:text-neutral-600 hover:bg-neutral-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-neutral-200">
                <td className="pt-3 text-sm font-semibold text-neutral-900">
                  Net Profit
                </td>
                <td
                  className={cn(
                    "pt-3 text-right text-sm font-bold tabular-nums",
                    order.net_profit >= 0 ? "text-success-600" : "text-danger-600"
                  )}
                >
                  {order.net_profit >= 0 ? "+" : ""}
                  {formatCents(order.net_profit, order.currency)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
