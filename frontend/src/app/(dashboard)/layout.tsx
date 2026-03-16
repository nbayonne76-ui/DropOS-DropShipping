"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { useAppStore } from "@/store/appStore";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/formatters";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const { isLoading, isError } = useAuth();

  useEffect(() => {
    if (isError) {
      router.replace("/login");
    }
  }, [isError, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center">
            <span className="text-white font-bold text-lg">D</span>
          </div>
          <div className="h-1 w-32 bg-neutral-200 rounded-full overflow-hidden">
            <div className="h-full w-1/2 bg-primary-500 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      <Sidebar />
      <div
        className={cn(
          "flex-1 flex flex-col min-h-screen transition-all duration-200",
          sidebarOpen ? "ml-56" : "ml-16"
        )}
      >
        <TopBar />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
