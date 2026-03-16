import Link from "next/link";
import { TrendingUp, DollarSign, Store, ArrowRight, BarChart3, Package } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-neutral-100 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">D</span>
            </div>
            <span className="font-semibold text-neutral-900 text-lg">DropOS</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors">Features</a>
            <a href="#pricing" className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors">Pricing</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
            >
              Get started
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-4 py-1.5 text-sm font-medium text-primary-700 mb-6 border border-primary-100">
            <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
            Phase 1 MVP — now in beta
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold text-neutral-900 leading-tight tracking-tight mb-6">
            The OS for your{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-primary-400">
              dropshipping business
            </span>
          </h1>
          <p className="text-xl text-neutral-500 max-w-2xl mx-auto mb-10">
            Crystal-clear profit tracking, accurate landed cost calculation, and
            multi-store analytics — all in one dashboard built for modern dropshippers.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3.5 text-base font-semibold text-white hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40"
            >
              Start for free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-6 py-3.5 text-base font-semibold text-neutral-700 hover:border-neutral-400 transition-all"
            >
              Sign in
            </Link>
          </div>
          <p className="mt-4 text-sm text-neutral-400">
            No credit card required. Free plan always available.
          </p>
        </div>

        {/* Dashboard preview placeholder */}
        <div className="mx-auto max-w-5xl mt-16 rounded-2xl border border-neutral-200 bg-neutral-50 shadow-2xl overflow-hidden">
          <div className="h-8 bg-neutral-100 border-b border-neutral-200 flex items-center px-4 gap-1.5">
            <div className="w-3 h-3 rounded-full bg-neutral-300" />
            <div className="w-3 h-3 rounded-full bg-neutral-300" />
            <div className="w-3 h-3 rounded-full bg-neutral-300" />
            <div className="ml-4 flex-1 bg-white rounded border border-neutral-200 h-4 text-xs flex items-center px-2 text-neutral-400 max-w-xs">
              dropos.app/dashboard/overview
            </div>
          </div>
          <div className="p-6 grid grid-cols-4 gap-4">
            {[
              { label: "Total Revenue", value: "$84,220", change: "+12.4%" },
              { label: "Net Profit", value: "$18,950", change: "+8.7%" },
              { label: "Avg Margin", value: "22.5%", change: "+1.2%" },
              { label: "Orders", value: "1,284", change: "+18.3%" },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-white rounded-xl border border-neutral-200 p-4">
                <p className="text-xs font-medium text-neutral-500 mb-1">{kpi.label}</p>
                <p className="text-2xl font-bold text-neutral-900">{kpi.value}</p>
                <p className="text-xs font-medium text-success-600 mt-1">{kpi.change}</p>
              </div>
            ))}
          </div>
          <div className="px-6 pb-6">
            <div className="bg-white rounded-xl border border-neutral-200 h-48 flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
                <p className="text-sm text-neutral-400">Profit trend chart</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-neutral-50 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-neutral-900 mb-4">
              Everything you need to run a profitable operation
            </h2>
            <p className="text-lg text-neutral-500 max-w-2xl mx-auto">
              From the moment an order is placed to when the profit hits your account,
              DropOS tracks every dollar.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: TrendingUp,
                color: "bg-primary-100 text-primary-600",
                title: "Profit Tracking",
                description:
                  "See true net profit for every order — supplier cost, fees, shipping, returns, ad spend, and customs all accounted for automatically.",
              },
              {
                icon: DollarSign,
                color: "bg-success-100 text-success-600",
                title: "Landed Cost Calculator",
                description:
                  "Know exactly what a product costs before you sell it. Factor in all 8 cost layers and get a suggested retail price with target margin.",
              },
              {
                icon: Store,
                color: "bg-warning-100 text-warning-600",
                title: "Multi-Store Dashboard",
                description:
                  "Connect Shopify and WooCommerce stores. Compare revenue, costs, and profit side-by-side across all your stores from one screen.",
              },
              {
                icon: BarChart3,
                color: "bg-primary-100 text-primary-600",
                title: "Advanced Analytics",
                description:
                  "Daily, weekly, and monthly profit trends. Cost breakdown by layer. Drill down into any store or time period to spot opportunities.",
              },
              {
                icon: Package,
                color: "bg-success-100 text-success-600",
                title: "Supplier Scorecards",
                description:
                  "Track on-time delivery rates, stock accuracy, and dispute rates for every supplier. Composite scores help you choose the best partners.",
              },
              {
                icon: ArrowRight,
                color: "bg-warning-100 text-warning-600",
                title: "Automatic Sync",
                description:
                  "Orders sync automatically from connected stores. No manual entry. Costs are applied intelligently based on your configuration.",
              },
            ].map(({ icon: Icon, color, title, description }) => (
              <div
                key={title}
                className="bg-white rounded-2xl border border-neutral-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center mb-4`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">{title}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-neutral-900 mb-4">
            Ready to see your real profits?
          </h2>
          <p className="text-lg text-neutral-500 mb-8">
            Join hundreds of dropshippers who've stopped guessing and started
            knowing their numbers.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-8 py-4 text-lg font-semibold text-white hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/25"
          >
            Create your free account
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200 py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">D</span>
            </div>
            <span className="text-sm font-medium text-neutral-600">DropOS</span>
          </div>
          <p className="text-xs text-neutral-400">
            &copy; {new Date().getFullYear()} DropOS. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
