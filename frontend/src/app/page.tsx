import Link from "next/link";
import {
  TrendingUp, DollarSign, Store, ArrowRight, BarChart3, Package,
  Zap, Shield, Check, ChevronRight, Star, Layers,
} from "lucide-react";

// ── Reusable pieces ────────────────────────────────────────────────────────────

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-primary-500/30 bg-primary-500/10 px-4 py-1.5 text-sm font-medium text-primary-400">
      <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse" />
      {children}
    </span>
  );
}

function GradientText({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-primary-300">
      {children}
    </span>
  );
}

// ── Dashboard mock ─────────────────────────────────────────────────────────────

function DashboardMock() {
  const kpis = [
    { label: "Total Revenue",  value: "$84,220", delta: "+12.4%", color: "text-neutral-100" },
    { label: "Net Profit",     value: "$18,950", delta: "+8.7%",  color: "text-success-400" },
    { label: "Avg Margin",     value: "22.5%",   delta: "+1.2%",  color: "text-success-400" },
    { label: "Active Orders",  value: "1,284",   delta: "+18.3%", color: "text-neutral-100" },
  ];

  const orders = [
    { id: "#4821", product: "Wireless Earbuds Pro",   store: "TechHub",   revenue: "$89.99", profit: "$21.40", margin: "23.8%", status: "Delivered" },
    { id: "#4820", product: "Portable Charger 20K",   store: "GadgetZone", revenue: "$45.00", profit: "$10.80", margin: "24.0%", status: "In Transit" },
    { id: "#4819", product: "Smart Watch Band",        store: "TechHub",   revenue: "$24.99", profit: "$5.25",  margin: "21.0%", status: "Processing" },
    { id: "#4818", product: "LED Desk Lamp",           store: "HomeStyle", revenue: "$39.99", profit: "$9.60",  margin: "24.0%", status: "Delivered" },
  ];

  // Sparkline bars (simulated trend)
  const bars = [40, 55, 45, 70, 65, 80, 75, 90, 85, 95, 88, 100];

  return (
    <div className="rounded-2xl border border-neutral-700/60 bg-neutral-900 shadow-2xl shadow-black/50 overflow-hidden text-xs">
      {/* Browser bar */}
      <div className="h-9 bg-neutral-800 border-b border-neutral-700 flex items-center px-4 gap-1.5">
        <div className="w-3 h-3 rounded-full bg-danger-500/60" />
        <div className="w-3 h-3 rounded-full bg-warning-500/60" />
        <div className="w-3 h-3 rounded-full bg-success-500/60" />
        <div className="ml-4 flex-1 bg-neutral-700 rounded border border-neutral-600 h-5 flex items-center px-3 text-neutral-400 max-w-xs text-[11px]">
          app.dropos.io/dashboard
        </div>
        <div className="ml-auto flex items-center gap-2 text-neutral-500 text-[10px]">
          <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />
          Live
        </div>
      </div>

      <div className="flex h-[360px]">
        {/* Sidebar */}
        <div className="w-48 bg-neutral-950 border-r border-neutral-800 flex flex-col py-4 px-3 flex-shrink-0">
          <div className="flex items-center gap-2 px-2 mb-6">
            <div className="w-6 h-6 rounded-md bg-primary-600 flex items-center justify-center">
              <span className="text-white font-bold text-[10px]">D</span>
            </div>
            <span className="font-semibold text-neutral-200 text-[11px]">DropOS</span>
          </div>
          {[
            { icon: BarChart3, label: "Overview",  active: true },
            { icon: Package,   label: "Orders",    active: false },
            { icon: Store,     label: "Stores",    active: false },
            { icon: Layers,    label: "Products",  active: false },
            { icon: TrendingUp,label: "Analytics", active: false },
          ].map(({ icon: Icon, label, active }) => (
            <div
              key={label}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg mb-0.5 ${
                active
                  ? "bg-primary-600/20 text-primary-400"
                  : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-[11px] font-medium">{label}</span>
            </div>
          ))}

          <div className="mt-auto px-2 pt-4 border-t border-neutral-800">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary-700 flex items-center justify-center text-[9px] font-bold text-white">JD</div>
              <div>
                <div className="text-[10px] font-medium text-neutral-300">John Doe</div>
                <div className="text-[9px] text-neutral-500">Pro plan</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 p-4 overflow-hidden flex flex-col gap-3 min-w-0">
          {/* KPI row */}
          <div className="grid grid-cols-4 gap-2">
            {kpis.map((k) => (
              <div key={k.label} className="bg-neutral-800 rounded-xl border border-neutral-700 p-3">
                <p className="text-[10px] text-neutral-500 mb-1">{k.label}</p>
                <p className={`text-base font-bold ${k.color}`}>{k.value}</p>
                <p className="text-[10px] font-medium text-success-500 mt-0.5">{k.delta}</p>
              </div>
            ))}
          </div>

          {/* Chart + sparkline row */}
          <div className="grid grid-cols-3 gap-2 flex-shrink-0">
            <div className="col-span-2 bg-neutral-800 rounded-xl border border-neutral-700 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold text-neutral-300">Profit trend — last 30 days</span>
                <span className="text-[10px] text-success-500 font-medium">+$2,340 vs last month</span>
              </div>
              <div className="flex items-end gap-1 h-16">
                {bars.map((h, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-sm transition-all ${i === bars.length - 1 ? "bg-primary-500" : "bg-primary-800/80"}`}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>
            <div className="bg-neutral-800 rounded-xl border border-neutral-700 p-3">
              <p className="text-[10px] font-semibold text-neutral-300 mb-2">Cost breakdown</p>
              {[
                { label: "Supplier",  pct: 58, color: "bg-primary-500" },
                { label: "Shipping",  pct: 18, color: "bg-success-500" },
                { label: "Fees",      pct: 12, color: "bg-warning-500" },
                { label: "Ads",       pct: 8,  color: "bg-danger-500" },
              ].map(({ label, pct, color }) => (
                <div key={label} className="mb-1.5">
                  <div className="flex justify-between text-[9px] text-neutral-400 mb-0.5">
                    <span>{label}</span><span>{pct}%</span>
                  </div>
                  <div className="h-1 bg-neutral-700 rounded-full">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Orders table */}
          <div className="bg-neutral-800 rounded-xl border border-neutral-700 flex-1 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-700">
              <span className="text-[10px] font-semibold text-neutral-300">Recent orders</span>
              <span className="text-[9px] text-primary-400 font-medium">View all →</span>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-700/50">
                  {["Order", "Product", "Store", "Revenue", "Profit", "Margin", "Status"].map(h => (
                    <th key={h} className="text-left text-[9px] font-medium text-neutral-500 px-3 py-1.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-neutral-700/30 hover:bg-neutral-700/20">
                    <td className="px-3 py-1.5 text-[10px] text-neutral-400 font-mono">{o.id}</td>
                    <td className="px-3 py-1.5 text-[10px] text-neutral-300 font-medium max-w-[100px] truncate">{o.product}</td>
                    <td className="px-3 py-1.5 text-[10px] text-neutral-400">{o.store}</td>
                    <td className="px-3 py-1.5 text-[10px] text-neutral-300">{o.revenue}</td>
                    <td className="px-3 py-1.5 text-[10px] text-success-400 font-medium">{o.profit}</td>
                    <td className="px-3 py-1.5 text-[10px] text-success-400">{o.margin}</td>
                    <td className="px-3 py-1.5">
                      <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${
                        o.status === "Delivered" ? "bg-success-500/15 text-success-400" :
                        o.status === "In Transit" ? "bg-primary-500/15 text-primary-400" :
                        "bg-warning-500/15 text-warning-400"
                      }`}>{o.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const features = [
    {
      icon: TrendingUp,
      color: "bg-primary-500/15 text-primary-400",
      title: "Real Profit Tracking",
      description: "See true net profit on every order — supplier cost, shipping, platform fees, ad spend, returns, and customs all deducted automatically. No more spreadsheet guesswork.",
    },
    {
      icon: DollarSign,
      color: "bg-success-500/15 text-success-400",
      title: "Landed Cost Calculator",
      description: "Know exactly what a product costs before you sell it. Layer all 8 cost components and get a recommended retail price at your target margin in one click.",
    },
    {
      icon: Store,
      color: "bg-warning-500/15 text-warning-400",
      title: "Multi-Store Dashboard",
      description: "Connect multiple Shopify stores. Compare revenue, costs, and profit side-by-side. One screen. Complete picture.",
    },
    {
      icon: Zap,
      color: "bg-primary-500/15 text-primary-400",
      title: "Automatic Sync",
      description: "GraphQL-powered order synchronization pulls data from connected stores in real time. Full and incremental sync. No manual entry ever.",
    },
    {
      icon: Package,
      color: "bg-success-500/15 text-success-400",
      title: "Supplier Scorecards",
      description: "Track delivery rates, stock accuracy, and dispute rates per supplier. Composite scores surface your best and worst partners instantly.",
    },
    {
      icon: Shield,
      color: "bg-danger-500/15 text-danger-400",
      title: "Enterprise Security",
      description: "Shopify OAuth 2.0 with PKCE, encrypted token storage, strict SQLAlchemy ORM, and zero known CVEs. Your data stays yours.",
    },
  ];

  const steps = [
    { n: "01", icon: Store,     title: "Connect your store",      desc: "One-click Shopify OAuth — authorize in 30 seconds, no API keys to manage." },
    { n: "02", icon: Zap,       title: "Orders sync automatically", desc: "GraphQL pulls historical and live orders. Costs are applied based on your configuration." },
    { n: "03", icon: TrendingUp, title: "See your real numbers",   desc: "Live dashboard shows true profit, margin trends, and supplier performance — no setup required." },
  ];

  const plans = [
    {
      name: "Starter",
      price: "Free",
      sub: "forever",
      color: "border-neutral-700",
      cta: "Get started free",
      ctaStyle: "border border-neutral-600 text-neutral-300 hover:border-primary-500 hover:text-primary-400",
      features: ["1 Shopify store", "100 orders / month", "Core profit tracking", "Landed cost calculator", "7-day data history"],
    },
    {
      name: "Growth",
      price: "$29",
      sub: "/ month",
      color: "border-primary-500",
      highlight: true,
      badge: "Most popular",
      cta: "Start free trial",
      ctaStyle: "bg-primary-600 hover:bg-primary-700 text-white",
      features: ["3 Shopify stores", "2,000 orders / month", "Full analytics dashboard", "Supplier scorecards", "90-day data history", "Webhook automation", "Email support"],
    },
    {
      name: "Scale",
      price: "$79",
      sub: "/ month",
      color: "border-neutral-700",
      cta: "Start free trial",
      ctaStyle: "border border-neutral-600 text-neutral-300 hover:border-primary-500 hover:text-primary-400",
      features: ["Unlimited stores", "Unlimited orders", "AI profit forecasting", "Multi-user access", "Full data history", "Priority support", "Custom integrations"],
    },
  ];

  const faqs = [
    { q: "Does DropOS work with WooCommerce?", a: "Shopify is fully supported today. WooCommerce and other platforms are on the roadmap for Q3 2026." },
    { q: "How accurate is the profit calculation?", a: "DropOS calculates 8 cost layers per order: supplier price, shipping, platform fees, payment processing, ad spend, returns, customs, and your overhead allocation. If you configure them, the number is exact." },
    { q: "Is my Shopify data safe?", a: "Yes. We use Shopify OAuth 2.0 with PKCE, store tokens encrypted at rest, and never resell your data. The codebase runs on 0 known CVEs." },
    { q: "Can I cancel anytime?", a: "Absolutely. No lock-in, no cancellation fees. Downgrade to the free plan or delete your account at any time from settings." },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">

      {/* ── Nav ── */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-neutral-800/80 bg-neutral-950/90 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center shadow-lg shadow-primary-600/30">
              <span className="text-white font-bold text-sm">D</span>
            </div>
            <span className="font-bold text-neutral-100 text-lg tracking-tight">DropOS</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            {[["#features","Features"],["#how","How it works"],["#pricing","Pricing"]].map(([href, label]) => (
              <a key={href} href={href} className="text-sm text-neutral-400 hover:text-neutral-100 transition-colors">{label}</a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-neutral-400 hover:text-neutral-100 transition-colors">
              Sign in
            </Link>
            <Link href="/register" className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/25">
              Get started
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <Badge>Phase 1 MVP — now in beta</Badge>

          <h1 className="mt-8 text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight mb-6">
            The OS for your{" "}
            <GradientText>dropshipping business</GradientText>
          </h1>

          <p className="text-lg sm:text-xl text-neutral-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Crystal-clear profit tracking, accurate landed cost calculation, and
            real-time multi-store analytics — all in one dashboard built for serious dropshippers.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/register" className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-7 py-3.5 text-base font-semibold text-white hover:bg-primary-700 transition-all shadow-xl shadow-primary-600/30 hover:shadow-primary-600/50">
              Start for free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/login" className="inline-flex items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900 px-7 py-3.5 text-base font-semibold text-neutral-300 hover:border-neutral-600 hover:text-white transition-all">
              Sign in
            </Link>
          </div>
          <p className="mt-4 text-sm text-neutral-600">No credit card required. Free plan always available.</p>
        </div>

        {/* Dashboard */}
        <div className="mx-auto max-w-5xl mt-16">
          <DashboardMock />
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 border-y border-neutral-800">
        <div className="mx-auto max-w-5xl grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: "$2M+",    label: "Revenue tracked in beta" },
            { value: "8",       label: "Cost layers per order" },
            { value: "0",       label: "Known CVEs" },
            { value: "< 30s",   label: "Store connection time" },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="text-3xl font-extrabold text-primary-400 mb-1">{value}</div>
              <div className="text-sm text-neutral-500">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary-400 uppercase tracking-widest mb-3">How it works</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Live in 3 steps</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-10 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-primary-500/40 to-transparent" />
            {steps.map(({ n, icon: Icon, title, desc }) => (
              <div key={n} className="flex flex-col items-center text-center">
                <div className="relative mb-6">
                  <div className="w-20 h-20 rounded-2xl border border-primary-500/30 bg-primary-500/10 flex items-center justify-center">
                    <Icon className="w-8 h-8 text-primary-400" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center text-[10px] font-bold text-white border-2 border-neutral-950">
                    {n}
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-neutral-900/40">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary-400 uppercase tracking-widest mb-3">Features</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Everything to run a profitable operation
            </h2>
            <p className="text-lg text-neutral-500 max-w-2xl mx-auto">
              From the moment an order is placed to when profit hits your account, DropOS tracks every dollar.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, color, title, description }) => (
              <div key={title} className="group bg-neutral-900 rounded-2xl border border-neutral-800 p-6 hover:border-primary-500/40 hover:bg-neutral-800/60 transition-all">
                <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center mb-5`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Integrations strip ── */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 border-y border-neutral-800">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12">
          <span className="text-sm text-neutral-600 font-medium">Integrates with</span>
          {[
            { label: "Shopify", icon: "🛍️" },
            { label: "GraphQL", icon: "⚡" },
            { label: "FastAPI",  icon: "🐍" },
            { label: "PostgreSQL", icon: "🐘" },
            { label: "Next.js", icon: "▲" },
          ].map(({ label, icon }) => (
            <div key={label} className="flex items-center gap-2 text-neutral-400 hover:text-neutral-200 transition-colors">
              <span className="text-lg">{icon}</span>
              <span className="text-sm font-semibold">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary-400 uppercase tracking-widest mb-3">Pricing</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Simple, transparent pricing</h2>
            <p className="text-lg text-neutral-500">Start free. Scale when you&apos;re ready.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-6 flex flex-col ${plan.color} ${
                  plan.highlight ? "bg-primary-600/5 shadow-xl shadow-primary-500/10" : "bg-neutral-900"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary-600 text-white text-xs font-bold rounded-full shadow-lg shadow-primary-600/30">
                    {plan.badge}
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-white mb-3">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className={`font-extrabold ${plan.highlight ? "text-4xl text-primary-400" : "text-4xl text-white"}`}>{plan.price}</span>
                    <span className="text-neutral-500 text-sm">{plan.sub}</span>
                  </div>
                </div>
                <ul className="flex flex-col gap-2.5 flex-1 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-neutral-400">
                      <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 ${plan.highlight ? "text-primary-400" : "text-success-500"}`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold text-center transition-colors ${plan.ctaStyle}`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-neutral-900/40">
        <div className="mx-auto max-w-2xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white">Frequently asked questions</h2>
          </div>
          <div className="flex flex-col gap-4">
            {faqs.map(({ q, a }) => (
              <div key={q} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                <h3 className="text-base font-semibold text-white mb-2 flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-primary-400 flex-shrink-0 mt-0.5" />
                  {q}
                </h3>
                <p className="text-sm text-neutral-500 leading-relaxed pl-6">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-1.5 mb-6">
            {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-warning-400 text-warning-400" />)}
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Stop guessing your profits.
            <br />
            <GradientText>Start knowing them.</GradientText>
          </h2>
          <p className="text-lg text-neutral-500 mb-10">
            Connect your Shopify store and see your real numbers in under 2 minutes.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-8 py-4 text-lg font-semibold text-white hover:bg-primary-700 transition-all shadow-xl shadow-primary-600/30"
          >
            Create your free account
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="mt-4 text-sm text-neutral-600">Free plan · No credit card · Cancel anytime</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-neutral-800 py-10 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">D</span>
            </div>
            <span className="font-bold text-neutral-300">DropOS</span>
          </div>
          <div className="flex items-center gap-8">
            {[["#features","Features"],["#how","How it works"],["#pricing","Pricing"]].map(([href, label]) => (
              <a key={href} href={href} className="text-sm text-neutral-600 hover:text-neutral-400 transition-colors">{label}</a>
            ))}
          </div>
          <p className="text-xs text-neutral-700">&copy; {new Date().getFullYear()} DropOS. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}
