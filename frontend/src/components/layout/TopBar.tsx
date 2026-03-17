"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, User, Settings } from "lucide-react";
import { cn } from "@/lib/formatters";
import { useAppStore } from "@/store/appStore";
import { useStores } from "@/hooks/useStores";
import { logout } from "@/lib/api/auth";

export function TopBar() {
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const activeStoreId = useAppStore((s) => s.activeStoreId);
  const setActiveStore = useAppStore((s) => s.setActiveStore);
  const storeLogout = useAppStore((s) => s.logout);
  const { stores } = useStores();

  const [storeOpen, setStoreOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const storeRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (storeRef.current && !storeRef.current.contains(e.target as Node)) {
        setStoreOpen(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeStore = stores.find((s) => s.id === activeStoreId);

  async function handleLogout() {
    try { await logout(); } catch { /* ignore */ }
    storeLogout();
    router.push("/login");
  }

  const initials = user?.full_name
    ? user.full_name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
    : "?";

  return (
    <header className="h-16 flex items-center gap-4 px-6 bg-white border-b border-neutral-200">
      {/* Store selector */}
      {stores.length > 0 && (
        <div ref={storeRef} className="relative">
          <button
            onClick={() => setStoreOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-success-500 flex-shrink-0" />
            <span className="max-w-[160px] truncate">
              {activeStore?.name ?? "All Stores"}
            </span>
            <ChevronDown
              className={cn(
                "w-4 h-4 text-neutral-400 transition-transform",
                storeOpen && "rotate-180"
              )}
            />
          </button>
          {storeOpen && (
            <div className="absolute top-full mt-1.5 left-0 w-56 bg-white rounded-xl border border-neutral-200 shadow-lg z-50 py-1 overflow-hidden">
              <button
                onClick={() => { setActiveStore(null); setStoreOpen(false); }}
                className={cn(
                  "w-full px-4 py-2 text-sm text-left hover:bg-neutral-50 flex items-center gap-2",
                  !activeStoreId && "font-medium text-primary-600"
                )}
              >
                All Stores
              </button>
              <div className="border-t border-neutral-100 my-1" />
              {stores.map((store) => (
                <button
                  key={store.id}
                  onClick={() => { setActiveStore(store.id); setStoreOpen(false); }}
                  className={cn(
                    "w-full px-4 py-2 text-sm text-left hover:bg-neutral-50 flex items-center gap-2",
                    activeStoreId === store.id && "font-medium text-primary-600"
                  )}
                >
                  <span className="w-2 h-2 rounded-full bg-success-400 flex-shrink-0" />
                  <span className="truncate">{store.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* User menu */}
      <div ref={userRef} className="relative">
        <button
          onClick={() => setUserOpen((o) => !o)}
          className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-neutral-100 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
            <span className="text-xs font-semibold text-primary-700">{initials}</span>
          </div>
          <div className="hidden sm:block text-left min-w-0">
            <p className="text-sm font-medium text-neutral-900 truncate max-w-[120px]">
              {user?.full_name ?? "Account"}
            </p>
            <p className="text-xs text-neutral-500 truncate max-w-[120px]">
              {user?.email}
            </p>
          </div>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-neutral-400 transition-transform",
              userOpen && "rotate-180"
            )}
          />
        </button>

        {userOpen && (
          <div className="absolute top-full mt-1.5 right-0 w-48 bg-white rounded-xl border border-neutral-200 shadow-lg z-50 py-1 overflow-hidden">
            <button
              onClick={() => { router.push("/settings"); setUserOpen(false); }}
              className="w-full px-4 py-2 text-sm text-left text-neutral-700 hover:bg-neutral-50 flex items-center gap-2"
            >
              <User className="w-4 h-4 text-neutral-400" />
              Profile
            </button>
            <button
              onClick={() => { router.push("/settings"); setUserOpen(false); }}
              className="w-full px-4 py-2 text-sm text-left text-neutral-700 hover:bg-neutral-50 flex items-center gap-2"
            >
              <Settings className="w-4 h-4 text-neutral-400" />
              Settings
            </button>
            <div className="border-t border-neutral-100 my-1" />
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 text-sm text-left text-danger-600 hover:bg-danger-50 flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
