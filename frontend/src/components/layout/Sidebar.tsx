"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  ShoppingCart,
  Store,
  Truck,
  Settings,
  Package,
  Calculator,
  CreditCard,
  ChevronLeft,
  ClipboardList,
  ClipboardCheck,
  Users,
  RotateCcw,
  Webhook,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/formatters";
import { useAppStore } from "@/store/appStore";
import { PLAN_LABELS } from "@/lib/constants";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/orders", label: "Orders", icon: ShoppingCart },
  { href: "/products", label: "Products", icon: Package },
  { href: "/suppliers", label: "Suppliers", icon: Truck },
  { href: "/purchase-orders", label: "Purchase Orders", icon: ClipboardCheck },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/returns", label: "Returns", icon: RotateCcw },
  { href: "/stores", label: "Stores", icon: Store },
  { href: "/webhooks", label: "Webhooks", icon: Webhook },
  { href: "/tools", label: "Tools", icon: Calculator },
  { href: "/audit-log", label: "Audit Log", icon: ClipboardList },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/billing", label: "Billing", icon: CreditCard },
];

const PLAN_BADGE_COLORS: Record<string, string> = {
  free: "bg-neutral-100 text-neutral-600",
  starter: "bg-blue-50 text-blue-700",
  growth: "bg-success-50 text-success-700",
  pro: "bg-amber-50 text-amber-700",
};

export function Sidebar() {
  const pathname = usePathname();
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);
  const user = useAppStore((s) => s.user);
  const plan = user?.plan ?? "free";

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex flex-col bg-white border-r border-neutral-200 transition-all duration-200",
        sidebarOpen ? "w-56" : "w-16"
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-neutral-200 flex-shrink-0">
        <Link href="/overview" className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">D</span>
          </div>
          {sidebarOpen && (
            <span className="font-semibold text-neutral-900 truncate">DropOS</span>
          )}
        </Link>
        {sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto p-1 rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-0.5 px-2">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive =
              pathname === href || pathname.startsWith(href + "/");

            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary-50 text-primary-700"
                      : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                  )}
                  title={!sidebarOpen ? label : undefined}
                >
                  <Icon
                    className={cn(
                      "w-5 h-5 flex-shrink-0",
                      isActive ? "text-primary-600" : "text-neutral-400"
                    )}
                  />
                  {sidebarOpen && <span className="truncate">{label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Plan badge */}
      <div className="px-3 pb-3 border-t border-neutral-100 pt-3 flex-shrink-0">
        {sidebarOpen ? (
          <Link
            href="/billing"
            className="flex items-center justify-between w-full rounded-xl px-3 py-2 hover:bg-neutral-50 transition-colors group"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Zap className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
              <span className="text-xs text-neutral-500 truncate">
                {user?.email ? user.email.split("@")[0] : "Account"}
              </span>
            </div>
            <span
              className={cn(
                "text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0",
                PLAN_BADGE_COLORS[plan] ?? PLAN_BADGE_COLORS.free
              )}
            >
              {PLAN_LABELS[plan] ?? plan}
            </span>
          </Link>
        ) : (
          <Link
            href="/billing"
            title={`${PLAN_LABELS[plan] ?? plan} plan`}
            className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-neutral-50"
          >
            <Zap className="w-4 h-4 text-neutral-400" />
          </Link>
        )}
      </div>

      {/* Collapse toggle when closed */}
      {!sidebarOpen && (
        <div className="px-2 pb-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-full flex items-center justify-center p-2 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          >
            <ChevronLeft className="w-4 h-4 rotate-180" />
          </button>
        </div>
      )}
    </aside>
  );
}
