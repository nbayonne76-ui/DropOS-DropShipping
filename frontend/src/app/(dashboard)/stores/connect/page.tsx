"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { connectShopifyStore } from "@/lib/api/stores";

export default function ConnectStorePage() {
  const [domain, setDomain] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Normalise domain: strip https://, trim whitespace, ensure .myshopify.com suffix
  function normaliseDomain(raw: string): string {
    let d = raw.trim().toLowerCase();
    d = d.replace(/^https?:\/\//, "");
    d = d.replace(/\/$/, "");
    if (!d.includes(".")) {
      d = `${d}.myshopify.com`;
    }
    return d;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const normDomain = normaliseDomain(domain);
    if (!normDomain.includes("myshopify.com")) {
      setError("Please enter a valid myshopify.com domain.");
      return;
    }

    setIsLoading(true);
    try {
      const { oauth_url } = await connectShopifyStore(normDomain);
      // Redirect to Shopify OAuth
      window.location.href = oauth_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initiate connection");
      setIsLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <Link
          href="/stores"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Connected Stores
        </Link>
        <PageHeader
          title="Connect a Store"
          subtitle="Link your Shopify store to start syncing orders"
        />
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="domain" className="label-base">
              Shopify Store Domain
            </label>
            <input
              id="domain"
              type="text"
              required
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="yourstore.myshopify.com"
              className="input-base"
            />
            <p className="mt-1.5 text-xs text-neutral-400">
              Enter your .myshopify.com domain. You can also paste your full store URL.
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-danger-50 border border-danger-200 px-4 py-3">
              <p className="text-sm text-danger-700">{error}</p>
            </div>
          )}

          <Button type="submit" loading={isLoading} className="w-full justify-center">
            {isLoading ? "Connecting…" : "Connect with Shopify"}
          </Button>
        </form>
      </Card>

      {/* Info section */}
      <Card title="How it works" subtitle="3 simple steps">
        <ol className="space-y-3 mt-1">
          {[
            "Enter your Shopify store domain above and click Connect.",
            "You'll be redirected to Shopify to approve the DropOS app installation.",
            "Once approved, your orders and revenue data will sync automatically.",
          ].map((step, i) => (
            <li key={i} className="flex gap-3 text-sm text-neutral-600">
              <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
        <a
          href="https://shopify.com/partners"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"
        >
          Learn more about Shopify app permissions
          <ExternalLink className="w-3 h-3" />
        </a>
      </Card>
    </div>
  );
}
