"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, ChevronDown, LogOut, Settings, User } from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/formatters";
import { useAppStore } from "@/store/appStore";
import { useStores } from "@/hooks/useStores";
import { logout } from "@/lib/api/auth";
import { markNotificationRead, useNotifications, useUnreadCount } from "@/hooks/useNotifications";

export function TopBar() {
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const activeStoreId = useAppStore((s) => s.activeStoreId);
  const setActiveStore = useAppStore((s) => s.setActiveStore);
  const storeLogout = useAppStore((s) => s.logout);
  const { stores } = useStores();

  const [storeOpen, setStoreOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);

  const storeRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  const { count: unreadCount } = useUnreadCount();
  const { notifications } = useNotifications(10);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (storeRef.current && !storeRef.current.contains(e.target as Node)) {
        setStoreOpen(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserOpen(false);
      }
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
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

      {/* Bell / notifications */}
      <div ref={bellRef} className="relative">
        <button
          onClick={() => setBellOpen((o) => !o)}
          className="relative flex items-center justify-center w-9 h-9 rounded-lg hover:bg-neutral-100 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5 text-neutral-600" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-danger-500 text-white text-[10px] font-bold px-1 leading-none">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {bellOpen && (
          <div className="absolute top-full mt-1.5 right-0 w-80 bg-white rounded-xl border border-neutral-200 shadow-lg z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
              <span className="text-sm font-semibold text-neutral-900">Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={() => markNotificationRead()}
                  className="text-xs text-primary-600 hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-neutral-400">
                  No notifications yet
                </p>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => markNotificationRead(n.id)}
                    className={cn(
                      "w-full text-left px-4 py-3 border-b border-neutral-50 hover:bg-neutral-50 transition-colors last:border-0",
                      !n.is_read && "bg-primary-50/40"
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      {!n.is_read && (
                        <span className="mt-1.5 w-2 h-2 rounded-full bg-primary-500 flex-shrink-0" />
                      )}
                      <div className={cn("min-w-0", n.is_read && "pl-4")}>
                        <p className="text-sm font-medium text-neutral-900 truncate">{n.title}</p>
                        <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-[11px] text-neutral-400 mt-1">
                          {formatRelativeTime(n.created_at)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-neutral-100 px-4 py-2.5">
              <button
                onClick={() => { router.push("/settings?tab=alerts"); setBellOpen(false); }}
                className="text-xs text-primary-600 hover:underline"
              >
                Manage alert rules →
              </button>
            </div>
          </div>
        )}
      </div>

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
