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
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/formatters";
import { useAppStore } from "@/store/appStore";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/orders", label: "Orders", icon: ShoppingCart },
  { href: "/dashboard/products", label: "Products", icon: Package },
  { href: "/dashboard/suppliers", label: "Suppliers", icon: Truck },
  { href: "/dashboard/stores", label: "Stores", icon: Store },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useAppStore((s) => ({
    sidebarOpen: s.sidebarOpen,
    setSidebarOpen: s.setSidebarOpen,
  }));

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex flex-col bg-white border-r border-neutral-200 transition-all duration-200",
        sidebarOpen ? "w-56" : "w-16"
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-neutral-200 flex-shrink-0">
        <Link href="/dashboard/overview" className="flex items-center gap-2.5 min-w-0">
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
