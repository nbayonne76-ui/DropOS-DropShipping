"use client";

import { useState, useCallback } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { calculateLandedCost } from "@/lib/api/tariffs";
import type { TariffLandedCostResponse } from "@/types/api";
import { formatCents, formatMargin } from "@/lib/formatters";
import { Calculator, TrendingUp, Package } from "lucide-react";

// ─── Profit Simulator ─────────────────────────────────────────────────────────

interface ProfitResult {
  grossRevenue: number;
  totalCost: number;
  netProfit: number;
  grossMargin: number;
  netMargin: number;
  platformFeeAmt: number;
  paymentFeeAmt: number;
}

function computeProfit(
  sellingPrice: number,
  cogs: number,
  shippingCost: number,
  platformFeeRate: number,
  paymentFeeRate: number,
  otherCosts: number
): ProfitResult {
  const grossRevenue = sellingPrice;
  const platformFeeAmt = grossRevenue * (platformFeeRate / 100);
  const paymentFeeAmt = grossRevenue * (paymentFeeRate / 100);
  const totalCost = cogs + shippingCost + platformFeeAmt + paymentFeeAmt + otherCosts;
  const netProfit = grossRevenue - totalCost;
  const grossMargin = grossRevenue > 0 ? (grossRevenue - cogs) / grossRevenue : 0;
  const netMargin = grossRevenue > 0 ? netProfit / grossRevenue : 0;
  return { grossRevenue, totalCost, netProfit, grossMargin, netMargin, platformFeeAmt, paymentFeeAmt };
}

function ProfitSimulator() {
  const [sellingPrice, setSellingPrice] = useState("");
  const [cogs, setCogs] = useState("");
  const [shippingCost, setShippingCost] = useState("");
  const [platformFeeRate, setPlatformFeeRate] = useState("2.0");
  const [paymentFeeRate, setPaymentFeeRate] = useState("2.9");
  const [otherCosts, setOtherCosts] = useState("0");

  const sp = parseFloat(sellingPrice) || 0;
  const c = parseFloat(cogs) || 0;
  const sh = parseFloat(shippingCost) || 0;
  const pfr = parseFloat(platformFeeRate) || 0;
  const pyr = parseFloat(paymentFeeRate) || 0;
  const oc = parseFloat(otherCosts) || 0;

  const result = sp > 0 ? computeProfit(sp, c, sh, pfr, pyr, oc) : null;

  const marginColor = (margin: number) => {
    if (margin >= 0.3) return "text-emerald-600";
    if (margin >= 0.15) return "text-amber-600";
    return "text-red-600";
  };

  return (
    <Card
      title="Profit & Margin Simulator"
      subtitle="Estimate net profit for any price/cost combination — no API call needed"
      action={<Calculator className="w-4 h-4 text-neutral-400" />}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Inputs */}
        <div className="space-y-4">
          <FieldRow
            label="Selling Price ($)"
            value={sellingPrice}
            onChange={setSellingPrice}
            placeholder="29.99"
          />
          <FieldRow
            label="COGS — Product Cost ($)"
            value={cogs}
            onChange={setCogs}
            placeholder="8.50"
          />
          <FieldRow
            label="Shipping Cost ($)"
            value={shippingCost}
            onChange={setShippingCost}
            placeholder="3.00"
          />
          <FieldRow
            label="Platform Fee (%)"
            value={platformFeeRate}
            onChange={setPlatformFeeRate}
            placeholder="2.0"
          />
          <FieldRow
            label="Payment Fee (%)"
            value={paymentFeeRate}
            onChange={setPaymentFeeRate}
            placeholder="2.9"
          />
          <FieldRow
            label="Other Costs ($)"
            value={otherCosts}
            onChange={setOtherCosts}
            placeholder="0"
          />
        </div>

        {/* Results */}
        <div className="flex flex-col justify-center">
          {result ? (
            <div className="space-y-3">
              <ResultRow label="Gross Revenue" value={`$${result.grossRevenue.toFixed(2)}`} />
              <ResultRow label="Platform Fee" value={`−$${result.platformFeeAmt.toFixed(2)}`} muted />
              <ResultRow label="Payment Fee" value={`−$${result.paymentFeeAmt.toFixed(2)}`} muted />
              <ResultRow label="COGS" value={`−$${c.toFixed(2)}`} muted />
              <ResultRow label="Shipping" value={`−$${sh.toFixed(2)}`} muted />
              {oc > 0 && <ResultRow label="Other Costs" value={`−$${oc.toFixed(2)}`} muted />}
              <div className="border-t border-neutral-200 pt-3 mt-1" />
              <ResultRow label="Total Cost" value={`$${result.totalCost.toFixed(2)}`} />
              <div className="rounded-lg bg-neutral-50 border border-neutral-200 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-neutral-900">Net Profit</span>
                  <span className={`text-lg font-bold ${result.netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {result.netProfit >= 0 ? "+" : ""}${result.netProfit.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-500">Gross Margin</span>
                  <span className={`text-sm font-medium ${marginColor(result.grossMargin)}`}>
                    {formatMargin(result.grossMargin)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-500">Net Margin</span>
                  <span className={`text-sm font-medium ${marginColor(result.netMargin)}`}>
                    {formatMargin(result.netMargin)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-neutral-400 py-10">
              <TrendingUp className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">Enter a selling price to see results</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// ─── Landed Cost Calculator ───────────────────────────────────────────────────

function LandedCostCalculator() {
  const [hsCode, setHsCode] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [valueUsd, setValueUsd] = useState("");
  const [result, setResult] = useState<TariffLandedCostResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = hsCode.trim() && origin.trim().length === 2 && destination.trim().length === 2 && parseFloat(valueUsd) > 0;

  const handleCalculate = useCallback(async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const valueCents = Math.round(parseFloat(valueUsd) * 100);
      const data = await calculateLandedCost({
        hs_code: hsCode.trim(),
        origin: origin.trim().toUpperCase(),
        destination: destination.trim().toUpperCase(),
        value_cents: valueCents,
      });
      setResult(data);
    } catch (e: unknown) {
      const err = e as { body?: { detail?: string }; message?: string };
      setError(err?.body?.detail ?? err?.message ?? "Calculation failed");
    } finally {
      setLoading(false);
    }
  }, [canSubmit, hsCode, origin, destination, valueUsd]);

  const dutyRate = result ? parseFloat(result.duty_rate) : 0;

  return (
    <Card
      title="Landed Cost Calculator"
      subtitle="Look up import duty rates by HS code and trade route"
      action={<Package className="w-4 h-4 text-neutral-400" />}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Inputs */}
        <div className="space-y-4">
          <FieldRow
            label="HS Code"
            value={hsCode}
            onChange={setHsCode}
            placeholder="e.g. 9403.20"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                Origin Country (ISO2)
              </label>
              <input
                type="text"
                maxLength={2}
                value={origin}
                onChange={(e) => setOrigin(e.target.value.toUpperCase())}
                placeholder="CN"
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                Destination (ISO2)
              </label>
              <input
                type="text"
                maxLength={2}
                value={destination}
                onChange={(e) => setDestination(e.target.value.toUpperCase())}
                placeholder="US"
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent uppercase"
              />
            </div>
          </div>
          <FieldRow
            label="Declared Value ($)"
            value={valueUsd}
            onChange={setValueUsd}
            placeholder="100.00"
          />
          <Button
            onClick={handleCalculate}
            disabled={!canSubmit || loading}
            className="w-full"
          >
            {loading ? "Calculating…" : "Calculate Landed Cost"}
          </Button>
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Results */}
        <div className="flex flex-col justify-center">
          {result ? (
            <div className="space-y-3">
              <ResultRow
                label="Trade Route"
                value={`${result.origin_country} → ${result.destination_country}`}
              />
              <ResultRow label="HS Code" value={result.hs_code} />
              <ResultRow label="Declared Value" value={formatCents(result.value_cents)} />
              <ResultRow
                label="Duty Rate"
                value={`${(dutyRate * 100).toFixed(2)}%`}
              />
              <ResultRow label="Duty Amount" value={formatCents(result.duty_cents)} />
              <div className="border-t border-neutral-200 pt-3 mt-1" />
              <div className="rounded-lg bg-neutral-50 border border-neutral-200 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-neutral-900">Total Landed Cost</span>
                  <span className="text-lg font-bold text-primary-700">
                    {formatCents(result.total_landed_cents)}
                  </span>
                </div>
                {result.cached && (
                  <p className="mt-2 text-xs text-neutral-400">Served from cache</p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-neutral-400 py-10">
              <Package className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">Enter trade details to calculate duties</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// ─── Shared UI helpers ────────────────────────────────────────────────────────

function FieldRow({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-neutral-600 mb-1.5">
        {label}
      </label>
      <input
        type="number"
        min="0"
        step="any"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
      />
    </div>
  );
}

function ResultRow({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${muted ? "text-neutral-400" : "text-neutral-700"}`}>
        {label}
      </span>
      <span className={`text-sm font-medium tabular-nums ${muted ? "text-neutral-400" : "text-neutral-900"}`}>
        {value}
      </span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ToolsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Tools"
        subtitle="Calculators to simulate profitability and estimate landed costs"
      />
      <ProfitSimulator />
      <LandedCostCalculator />
    </div>
  );
}
