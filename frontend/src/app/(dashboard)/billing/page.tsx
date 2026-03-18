"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Zap, CreditCard, ExternalLink } from "lucide-react";
import useSWR from "swr";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  createCheckoutSession,
  createPortalSession,
  getSubscription,
} from "@/lib/api/billing";
import { useAppStore } from "@/store/appStore";
import type { SubscriptionStatus } from "@/types/api";

// ─── Pricing data ─────────────────────────────────────────────────────────────

interface PricingTier {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  highlighted: boolean;
}

const TIERS: PricingTier[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Get started with one store.",
    features: [
      "1 Shopify store",
      "Up to 1,000 orders/month",
      "Basic profit tracking",
      "Manual cost editing",
    ],
    cta: "Current plan",
    highlighted: false,
  },
  {
    id: "starter",
    name: "Starter",
    price: "$29",
    period: "/ month",
    description: "For growing stores that need more insight.",
    features: [
      "Up to 3 Shopify stores",
      "Up to 5,000 orders/month",
      "CSV export (orders + analytics)",
      "Webhook event log",
      "Landed cost calculator",
    ],
    cta: "Upgrade to Starter",
    highlighted: false,
  },
  {
    id: "growth",
    name: "Growth",
    price: "$79",
    period: "/ month",
    description: "For high-volume sellers with automation needs.",
    features: [
      "Up to 5 Shopify stores",
      "Unlimited orders",
      "All Starter features",
      "Auto-fulfillment on payment",
      "Bulk COGS import",
      "Priority support",
    ],
    cta: "Upgrade to Growth",
    highlighted: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$199",
    period: "/ month",
    description: "For agencies and high-scale operations.",
    features: [
      "Unlimited stores",
      "Unlimited orders",
      "All Growth features",
      "Supplier performance tracking",
      "Dedicated onboarding",
    ],
    cta: "Upgrade to Pro",
    highlighted: false,
  },
];

const PLAN_ORDER = ["free", "starter", "growth", "pro"];

function statusBadge(status: SubscriptionStatus) {
  switch (status) {
    case "active": return <Badge variant="success" dot>Active</Badge>;
    case "trialing": return <Badge variant="info" dot>Trialing</Badge>;
    case "past_due": return <Badge variant="warning" dot>Past due</Badge>;
    case "canceled": return <Badge variant="danger" dot>Canceled</Badge>;
    default: return <Badge variant="neutral" dot>Free</Badge>;
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const searchParams = useSearchParams();
  const success = searchParams.get("success") === "1";
  const canceled = searchParams.get("canceled") === "1";

  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);
  const currentPlan = user?.plan ?? "free";

  const { data: sub, isLoading: subLoading } = useSWR(
    "/billing/subscription",
    getSubscription,
    { revalidateOnFocus: false }
  );

  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  async function handleUpgrade(planId: string) {
    setLoadingPlan(planId);
    try {
      const { url } = await createCheckoutSession(planId);
      window.location.href = url;
    } finally {
      setLoadingPlan(null);
    }
  }

  async function handlePortal() {
    setPortalLoading(true);
    try {
      const { url } = await createPortalSession();
      window.open(url, "_blank");
    } finally {
      setPortalLoading(false);
    }
  }

  const currentIdx = PLAN_ORDER.indexOf(currentPlan);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Billing"
        subtitle="Manage your subscription and plan"
        action={
          sub?.stripe_customer_id ? (
            <Button
              variant="secondary"
              size="sm"
              loading={portalLoading}
              leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
              onClick={handlePortal}
            >
              Manage billing
            </Button>
          ) : undefined
        }
      />

      {/* Status messages */}
      {success && (
        <div className="bg-success-50 border border-success-200 rounded-xl px-4 py-3 flex items-center gap-2">
          <Check className="w-4 h-4 text-success-600 flex-shrink-0" />
          <p className="text-sm text-success-700 font-medium">
            Subscription activated! Your plan has been upgraded.
          </p>
        </div>
      )}
      {canceled && (
        <div className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3">
          <p className="text-sm text-neutral-600">Checkout was canceled — no charge was made.</p>
        </div>
      )}

      {/* Current plan card */}
      <Card title="Current plan">
        {subLoading ? (
          <div className="flex items-center gap-4">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center">
                <Zap className="w-4.5 h-4.5 text-primary-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900 capitalize">
                  {currentPlan} plan
                </p>
                <p className="text-xs text-neutral-500">
                  {TIERS.find((t) => t.id === currentPlan)?.price ?? "$0"}{" "}
                  {currentPlan !== "free" ? "/ month" : "forever"}
                </p>
              </div>
            </div>
            {sub && statusBadge(sub.status)}
          </div>
        )}
      </Card>

      {/* Pricing table */}
      <div>
        <h2 className="text-sm font-semibold text-neutral-700 mb-4">Choose a plan</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {TIERS.map((tier) => {
            const tierIdx = PLAN_ORDER.indexOf(tier.id);
            const isCurrent = tier.id === currentPlan;
            const isDowngrade = tierIdx < currentIdx;
            const isUpgrade = tierIdx > currentIdx;

            return (
              <div
                key={tier.id}
                className={`relative flex flex-col rounded-2xl border p-5 transition-shadow ${
                  tier.highlighted
                    ? "border-primary-400 shadow-md shadow-primary-100 bg-primary-50/30"
                    : "border-neutral-200 bg-white"
                }`}
              >
                {tier.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-600 text-white text-xs font-semibold px-3 py-0.5 rounded-full">
                    Most popular
                  </span>
                )}

                {/* Plan header */}
                <div className="mb-4">
                  <p className="text-sm font-semibold text-neutral-900">{tier.name}</p>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-bold text-neutral-900">{tier.price}</span>
                    <span className="text-xs text-neutral-500">{tier.period}</span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1.5">{tier.description}</p>
                </div>

                {/* Features */}
                <ul className="space-y-2 flex-1 mb-5">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-success-500 mt-0.5 flex-shrink-0" />
                      <span className="text-xs text-neutral-600">{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {isCurrent ? (
                  <div className="w-full text-center py-2 rounded-xl bg-neutral-100 text-xs font-semibold text-neutral-500">
                    Current plan
                  </div>
                ) : isUpgrade ? (
                  <Button
                    size="sm"
                    variant={tier.highlighted ? "primary" : "secondary"}
                    loading={loadingPlan === tier.id}
                    onClick={() => handleUpgrade(tier.id)}
                    className="w-full"
                  >
                    {tier.cta}
                  </Button>
                ) : isDowngrade ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={portalLoading}
                    onClick={handlePortal}
                    className="w-full text-neutral-500"
                  >
                    Downgrade
                  </Button>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Billing note */}
      <p className="text-xs text-neutral-400 flex items-center gap-1.5">
        <CreditCard className="w-3.5 h-3.5" />
        Payments are processed securely by Stripe. Cancel anytime from the billing portal.
      </p>
    </div>
  );
}
