import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types/api";
import type { DateRange } from "@/types/analytics";
import { subDays } from "date-fns";

interface AppState {
  // Auth
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;

  // Active store context
  activeStoreId: string | null;

  // Global date range filter
  dateRange: DateRange;

  // Sidebar
  sidebarOpen: boolean;
}

interface AppActions {
  setUser: (user: User | null) => void;
  setTokens: (access: string, refresh: string) => void;
  clearTokens: () => void;
  setActiveStore: (storeId: string | null) => void;
  setDateRange: (range: DateRange) => void;
  setSidebarOpen: (open: boolean) => void;
  logout: () => void;
}

const DEFAULT_DATE_RANGE: DateRange = {
  from: subDays(new Date(), 30),
  to: new Date(),
};

export const useAppStore = create<AppState & AppActions>()(
  persist(
    (set) => ({
      // ─── State ────────────────────────────────────────────────────────────
      user: null,
      accessToken: null,
      refreshToken: null,
      activeStoreId: null,
      dateRange: DEFAULT_DATE_RANGE,
      sidebarOpen: true,

      // ─── Actions ──────────────────────────────────────────────────────────
      setUser: (user) => set({ user }),

      setTokens: (access, refresh) => {
        // Also persist to cookies for middleware / SSR
        if (typeof document !== "undefined") {
          const secure = location.protocol === "https:" ? "; Secure" : "";
          document.cookie = `access_token=${encodeURIComponent(access)}; Path=/${secure}; SameSite=Lax`;
          document.cookie = `refresh_token=${encodeURIComponent(refresh)}; Path=/${secure}; SameSite=Lax`;
        }
        set({ accessToken: access, refreshToken: refresh });
      },

      clearTokens: () => {
        if (typeof document !== "undefined") {
          document.cookie = "access_token=; Path=/; Max-Age=0";
          document.cookie = "refresh_token=; Path=/; Max-Age=0";
        }
        set({ accessToken: null, refreshToken: null });
      },

      setActiveStore: (storeId) => set({ activeStoreId: storeId }),

      setDateRange: (range) => set({ dateRange: range }),

      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      logout: () => {
        if (typeof document !== "undefined") {
          document.cookie = "access_token=; Path=/; Max-Age=0";
          document.cookie = "refresh_token=; Path=/; Max-Age=0";
        }
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          activeStoreId: null,
        });
      },
    }),
    {
      name: "dropos-app-store",
      // Only persist non-sensitive, non-reactive fields
      partialize: (state) => ({
        activeStoreId: state.activeStoreId,
        sidebarOpen: state.sidebarOpen,
        // dateRange has Date objects — serialise as ISO strings
        dateRange: {
          from: state.dateRange.from.toISOString(),
          to: state.dateRange.to.toISOString(),
        },
      }),
      // Rehydrate date strings back to Date objects
      onRehydrateStorage: () => (state) => {
        if (state?.dateRange) {
          state.dateRange = {
            from: new Date((state.dateRange as unknown as { from: string }).from),
            to: new Date((state.dateRange as unknown as { to: string }).to),
          };
        }
      },
    }
  )
);
