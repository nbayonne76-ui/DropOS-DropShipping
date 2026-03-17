import Link from "next/link";
import {
  TrendingUp, DollarSign, Store, BarChart3, Package,
  Zap, Shield, ChevronRight, Layers, Users, MessageSquare,
  Lock, Flame,
} from "lucide-react";

// ── Helpers ────────────────────────────────────────────────────────────────────

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
    { id: "#4821", product: "Wireless Earbuds Pro",  store: "TechHub",    revenue: "$89.99", profit: "$21.40", margin: "23.8%", status: "Delivered" },
    { id: "#4820", product: "Portable Charger 20K",  store: "GadgetZone", revenue: "$45.00", profit: "$10.80", margin: "24.0%", status: "In Transit" },
    { id: "#4819", product: "Smart Watch Band",       store: "TechHub",    revenue: "$24.99", profit: "$5.25",  margin: "21.0%", status: "Processing" },
    { id: "#4818", product: "LED Desk Lamp",          store: "HomeStyle",  revenue: "$39.99", profit: "$9.60",  margin: "24.0%", status: "Delivered" },
  ];
  const bars = [40, 55, 45, 70, 65, 80, 75, 90, 85, 95, 88, 100];

  return (
    <div className="rounded-2xl border border-neutral-700/60 bg-neutral-900 shadow-2xl shadow-black/50 overflow-hidden text-xs">
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
        <div className="w-48 bg-neutral-950 border-r border-neutral-800 flex flex-col py-4 px-3 flex-shrink-0">
          <div className="flex items-center gap-2 px-2 mb-6">
            <div className="w-6 h-6 rounded-md bg-primary-600 flex items-center justify-center">
              <span className="text-white font-bold text-[10px]">D</span>
            </div>
            <span className="font-semibold text-neutral-200 text-[11px]">DropOS</span>
          </div>
          {[
            { icon: BarChart3, label: "Overview",   active: true },
            { icon: Package,   label: "Orders",     active: false },
            { icon: Store,     label: "Stores",     active: false },
            { icon: Layers,    label: "Products",   active: false },
            { icon: TrendingUp,label: "Analytics",  active: false },
          ].map(({ icon: Icon, label, active }) => (
            <div key={label} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg mb-0.5 ${active ? "bg-primary-600/20 text-primary-400" : "text-neutral-500"}`}>
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-[11px] font-medium">{label}</span>
            </div>
          ))}
          <div className="mt-auto px-2 pt-4 border-t border-neutral-800">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary-700 flex items-center justify-center text-[9px] font-bold text-white">JD</div>
              <div>
                <div className="text-[10px] font-medium text-neutral-300">Founding Member</div>
                <div className="text-[9px] text-primary-400 font-medium">Free, 1 year</div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 p-4 overflow-hidden flex flex-col gap-3 min-w-0">
          <div className="grid grid-cols-4 gap-2">
            {kpis.map((k) => (
              <div key={k.label} className="bg-neutral-800 rounded-xl border border-neutral-700 p-3">
                <p className="text-[10px] text-neutral-500 mb-1">{k.label}</p>
                <p className={`text-base font-bold ${k.color}`}>{k.value}</p>
                <p className="text-[10px] font-medium text-success-500 mt-0.5">{k.delta}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 flex-shrink-0">
            <div className="col-span-2 bg-neutral-800 rounded-xl border border-neutral-700 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold text-neutral-300">Profit trend: last 30 days</span>
                <span className="text-[10px] text-success-500 font-medium">+$2,340 vs last month</span>
              </div>
              <div className="flex items-end gap-1 h-16">
                {bars.map((h, i) => (
                  <div key={i} className={`flex-1 rounded-sm ${i === bars.length - 1 ? "bg-primary-500" : "bg-primary-800/80"}`} style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
            <div className="bg-neutral-800 rounded-xl border border-neutral-700 p-3">
              <p className="text-[10px] font-semibold text-neutral-300 mb-2">Cost breakdown</p>
              {[
                { label: "Supplier", pct: 58, color: "bg-primary-500" },
                { label: "Shipping", pct: 18, color: "bg-success-500" },
                { label: "Fees",     pct: 12, color: "bg-warning-500" },
                { label: "Ads",      pct: 8,  color: "bg-danger-500" },
              ].map(({ label, pct, color }) => (
                <div key={label} className="mb-1.5">
                  <div className="flex justify-between text-[9px] text-neutral-400 mb-0.5"><span>{label}</span><span>{pct}%</span></div>
                  <div className="h-1 bg-neutral-700 rounded-full"><div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-neutral-800 rounded-xl border border-neutral-700 flex-1 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-700">
              <span className="text-[10px] font-semibold text-neutral-300">Recent orders</span>
              <span className="text-[9px] text-primary-400 font-medium">View all →</span>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-700/50">
                  {["Order","Product","Store","Revenue","Profit","Margin","Status"].map(h => (
                    <th key={h} className="text-left text-[9px] font-medium text-neutral-500 px-3 py-1.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-neutral-700/30">
                    <td className="px-3 py-1.5 text-[10px] text-neutral-400 font-mono">{o.id}</td>
                    <td className="px-3 py-1.5 text-[10px] text-neutral-300 font-medium max-w-[100px] truncate">{o.product}</td>
                    <td className="px-3 py-1.5 text-[10px] text-neutral-400">{o.store}</td>
                    <td className="px-3 py-1.5 text-[10px] text-neutral-300">{o.revenue}</td>
                    <td className="px-3 py-1.5 text-[10px] text-success-400 font-medium">{o.profit}</td>
                    <td className="px-3 py-1.5 text-[10px] text-success-400">{o.margin}</td>
                    <td className="px-3 py-1.5">
                      <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${o.status === "Delivered" ? "bg-success-500/15 text-success-400" : o.status === "In Transit" ? "bg-primary-500/15 text-primary-400" : "bg-warning-500/15 text-warning-400"}`}>
                        {o.status}
                      </span>
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

// ── Spot counter ───────────────────────────────────────────────────────────────

function SpotCounter({ claimed = 47, total = 100 }: { claimed?: number; total?: number }) {
  const pct = Math.round((claimed / total) * 100);
  return (
    <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-warning-400" />
          <span className="text-sm font-semibold text-white">Spots remaining</span>
        </div>
        <span className="text-sm font-bold text-warning-400">{total - claimed} left</span>
      </div>
      <div className="h-2.5 bg-neutral-800 rounded-full overflow-hidden mb-2">
        <div
          className="h-full rounded-full bg-gradient-to-r from-warning-500 to-warning-400 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-neutral-500">
        <span>{claimed} spots claimed</span>
        <span>{total} total</span>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const features = [
    { icon: TrendingUp, color: "bg-primary-500/15 text-primary-400",  title: "Real Profit Tracking",       description: "True net profit on every order. Supplier cost, shipping, platform fees, ad spend, returns, and customs all deducted automatically." },
    { icon: DollarSign, color: "bg-success-500/15 text-success-400",  title: "Landed Cost Calculator",     description: "Know exactly what a product costs before you sell it. Stack all 8 cost layers and get a suggested retail price at your target margin." },
    { icon: Store,      color: "bg-warning-500/15 text-warning-400",  title: "Multi-Store Dashboard",      description: "Connect multiple Shopify stores. Compare revenue, costs, and profit side-by-side. One screen, complete picture." },
    { icon: Zap,        color: "bg-primary-500/15 text-primary-400",  title: "Automatic Sync",             description: "GraphQL-powered order synchronization pulls data from connected stores in real time. Full and incremental sync. No manual entry." },
    { icon: Package,    color: "bg-success-500/15 text-success-400",  title: "Supplier Scorecards",        description: "Track delivery rates, stock accuracy, and dispute rates per supplier. Composite scores surface your best and worst partners instantly." },
    { icon: Shield,     color: "bg-danger-500/15 text-danger-400",    title: "Enterprise Security",        description: "Shopify OAuth 2.0 with PKCE, encrypted token storage, strict SQLAlchemy ORM, and zero known CVEs. Your data stays yours." },
  ];

  const steps = [
    { n: "01", icon: Store,      title: "Connect your store",       desc: "One-click Shopify OAuth. Authorize in 30 seconds, no API keys to manage." },
    { n: "02", icon: Zap,        title: "Orders sync automatically", desc: "GraphQL pulls historical and live orders. Costs are applied based on your configuration." },
    { n: "03", icon: TrendingUp, title: "See your real numbers",    desc: "Live dashboard shows true profit, margin trends, and supplier performance. No setup required." },
  ];

  const faqs = [
    { q: "Does DropOS work with WooCommerce?",     a: "Shopify is fully supported today. WooCommerce and other platforms are on the roadmap for Q3 2026." },
    { q: "How accurate is the profit calculation?", a: "DropOS calculates 8 cost layers per order: supplier price, shipping, platform fees, payment processing, ad spend, returns, customs, and overhead. If you configure them, the number is exact." },
    { q: "Is my Shopify data safe?",               a: "Yes. We use Shopify OAuth 2.0 with PKCE, store tokens encrypted at rest, and never resell your data. The codebase runs on 0 known CVEs." },
    { q: "What happens after the free year?",      a: "As a Founding Member you lock in our lowest tier pricing: the rate that exists when we go paid. No surprise increases." },
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
            {[["#offer","The Offer"],["#features","Features"],["#how","How it works"]].map(([href,label]) => (
              <a key={href} href={href} className="text-sm text-neutral-400 hover:text-neutral-100 transition-colors">{label}</a>
            ))}
          </nav>
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 rounded-lg bg-warning-500 hover:bg-warning-400 px-4 py-2 text-sm font-semibold text-neutral-950 transition-colors shadow-lg shadow-warning-500/25"
          >
            <Flame className="w-3.5 h-3.5" />
            Claim your spot
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="pt-32 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">

          {/* Urgency badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-warning-500/40 bg-warning-500/10 px-4 py-1.5 text-sm font-semibold text-warning-400 mb-8">
            <Flame className="w-4 h-4" />
            100 Founding Member spots. First come, first served
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight mb-6">
            1 year free.{" "}
            <GradientText>Full access.</GradientText>
            <br />
            Help me build{" "}
            <span className="text-white">the right tool.</span>
          </h1>

          <p className="text-lg sm:text-xl text-neutral-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            DropOS is a profit tracking & analytics platform built for dropshippers.
            I&apos;m opening <strong className="text-white">100 founding member spots</strong>, completely free for a full year,
            in exchange for 30 days of honest feedback.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-warning-500 hover:bg-warning-400 px-8 py-4 text-lg font-bold text-neutral-950 transition-all shadow-xl shadow-warning-500/30 hover:shadow-warning-500/50"
            >
              <Flame className="w-5 h-5" />
              Claim your founding spot
            </Link>
            <a
              href="#offer"
              className="inline-flex items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900 px-8 py-4 text-lg font-semibold text-neutral-300 hover:border-neutral-600 hover:text-white transition-all"
            >
              See what&apos;s included
              <ChevronRight className="w-5 h-5" />
            </a>
          </div>

          <p className="text-sm text-neutral-600">No credit card. No commitment. 100 spots total.</p>
        </div>

        {/* Dashboard */}
        <div className="mx-auto max-w-5xl mt-16">
          <DashboardMock />
        </div>
      </section>

      {/* ── Founding Member offer ── */}
      <section id="offer" className="py-24 px-4 sm:px-6 lg:px-8 border-t border-neutral-800">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-warning-400 uppercase tracking-widest mb-3">The offer</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              This is not a typical launch.
            </h2>
            <p className="text-lg text-neutral-500 max-w-xl mx-auto">
              I don&apos;t want 100 passive users. I want 100 people who will help me make this perfect.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">

            {/* What you get */}
            <div className="bg-neutral-900 border border-primary-500/30 rounded-2xl p-7">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary-500/15 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-primary-400" />
                </div>
                <h3 className="text-xl font-bold text-white">What you get</h3>
              </div>
              <ul className="flex flex-col gap-4">
                {[
                  { icon: "✅", text: "1 full year of DropOS, completely free" },
                  { icon: "✅", text: "Full access to every feature from day one" },
                  { icon: "✅", text: "Direct line to me, the founder" },
                  { icon: "✅", text: "Locked-in pricing when we go paid" },
                ].map(({ icon, text }) => (
                  <li key={text} className="flex items-start gap-3">
                    <span className="text-lg flex-shrink-0 mt-0.5">{icon}</span>
                    <span className="text-neutral-300 leading-snug">{text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* What I ask */}
            <div className="bg-neutral-900 border border-warning-500/30 rounded-2xl p-7">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-warning-500/15 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-warning-400" />
                </div>
                <h3 className="text-xl font-bold text-white">What I ask in return</h3>
              </div>
              <ul className="flex flex-col gap-4">
                {[
                  { icon: "🎯", text: "30 days of your honest feedback" },
                  { icon: "🎯", text: "Tell me what's broken, what's missing, what you'd pay for" },
                  { icon: "🎯", text: "Help me build the tool the dropshipping community actually needs" },
                ].map(({ icon, text }) => (
                  <li key={text} className="flex items-start gap-3">
                    <span className="text-lg flex-shrink-0 mt-0.5">{icon}</span>
                    <span className="text-neutral-300 leading-snug">{text}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 pt-5 border-t border-neutral-800">
                <p className="text-sm text-neutral-500 italic leading-relaxed">
                  &ldquo;If you do dropshipping, beginner or advanced, one store or ten.
                  I want to hear from you.&rdquo;
                </p>
              </div>
            </div>
          </div>

          {/* Spot counter + CTA */}
          <div className="max-w-xl mx-auto flex flex-col gap-4">
            <SpotCounter claimed={47} total={100} />
            <Link
              href="/register"
              className="w-full py-4 rounded-xl bg-warning-500 hover:bg-warning-400 text-neutral-950 font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-xl shadow-warning-500/25 hover:shadow-warning-500/40"
            >
              <Flame className="w-5 h-5" />
              Claim your founding spot now
            </Link>
            <p className="text-center text-sm text-neutral-600">
              First come, first served · 100 spots total · No credit card required
            </p>
          </div>
        </div>
      </section>

      {/* ── Who it&apos;s for ── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-neutral-900/40">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-3 mb-8 justify-center">
            <Users className="w-5 h-5 text-primary-400" />
            <h2 className="text-2xl font-bold text-white">Who this is for</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Beginners",       desc: "Just started your first Shopify store and want to understand your real margins from day one." },
              { label: "Growing sellers", desc: "Managing 2-5 stores and drowning in spreadsheets. You need one dashboard for all of it." },
              { label: "Advanced operators", desc: "Running a serious operation with multiple suppliers. You want data-driven decisions, not gut feelings." },
            ].map(({ label, desc }) => (
              <div key={label} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 hover:border-primary-500/30 transition-colors">
                <div className="w-2 h-2 rounded-full bg-primary-400 mb-3" />
                <h3 className="font-semibold text-white mb-2">{label}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary-400 uppercase tracking-widest mb-3">How it works</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Live in 3 steps</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
              Full access from day one. No feature gates, no locked tiers for founding members.
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

      {/* ── Stats bar ── */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 border-y border-neutral-800">
        <div className="mx-auto max-w-5xl grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: "100",    label: "Founding spots total" },
            { value: "8",      label: "Cost layers per order" },
            { value: "0",      label: "Known CVEs" },
            { value: "< 30s",  label: "Store connection time" },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="text-3xl font-extrabold text-primary-400 mb-1">{value}</div>
              <div className="text-sm text-neutral-500">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white">Questions</h2>
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
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-neutral-900/40">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-warning-500/30 bg-warning-500/10 px-4 py-1.5 text-sm font-semibold text-warning-400 mb-8">
            <Flame className="w-4 h-4" />
            53 spots remaining
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Stop guessing your profits.
            <br />
            <GradientText>Start knowing them, for free.</GradientText>
          </h2>
          <p className="text-lg text-neutral-500 mb-4 leading-relaxed">
            Connect your Shopify store and see your real numbers in under 2 minutes.
            <br />
            Free for a full year. No strings attached.
          </p>
          <p className="text-sm text-neutral-600 mb-10">
            Or apply directly at{" "}
            <a href="https://happi-bot.com" target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:text-primary-300 underline underline-offset-2">
              happi-bot.com
            </a>
            {" "}· Follow us on LinkedIn for updates · DM me directly
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-warning-500 hover:bg-warning-400 px-8 py-4 text-lg font-bold text-neutral-950 transition-all shadow-xl shadow-warning-500/30"
          >
            <Flame className="w-5 h-5" />
            Claim your founding spot
          </Link>
          <p className="mt-4 text-sm text-neutral-600">100 spots · First come, first served · No credit card</p>
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
            {[["#offer","The Offer"],["#features","Features"],["#how","How it works"]].map(([href, label]) => (
              <a key={href} href={href} className="text-sm text-neutral-600 hover:text-neutral-400 transition-colors">{label}</a>
            ))}
          </div>
          <p className="text-xs text-neutral-700">&copy; {new Date().getFullYear()} DropOS. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}
