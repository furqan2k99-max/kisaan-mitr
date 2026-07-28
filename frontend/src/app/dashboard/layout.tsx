"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAppStore";
import { authApi, setAuthToken } from "@/lib/api";
import { Sidebar } from "@/components/layout/Sidebar";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { MobileNav } from "@/components/layout/MobileNav";

const DARK_THEME_BG = "bg-[#0f2318]";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, hasHydrated, setUser, logout, accessToken } = useAuthStore();
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(false);

  const role = user?.role;

  useEffect(() => {
    if (!hasHydrated) return;

    // Ensure API client has the token before any guarded calls.
    setAuthToken(accessToken);

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (!user && !isLoadingUser) {
      let cancelled = false;
      setIsLoadingUser(true);
      authApi
        .getMe({ timeout: 8000 })
        .then((me) => {
          if (!cancelled) setUser(me);
        })
        .catch(() => {
          if (cancelled) return;
          logout();
          router.replace("/login");
        })
        .finally(() => {
          if (!cancelled) setIsLoadingUser(false);
        });
      return () => {
        cancelled = true;
      };
    }

    // Central role-based route protection.
    // Redirect unauthorized users back to /dashboard (which will route them to their role home).
    if (role) {
      const allow: Array<{ prefix: string; roles: string[] }> = [
        { prefix: "/dashboard/admin", roles: ["admin"] },
        { prefix: "/dashboard/analytics", roles: ["admin"] },
        { prefix: "/dashboard/fleet", roles: ["admin"] },
        { prefix: "/dashboard/mandis", roles: ["admin"] },
        { prefix: "/dashboard/users", roles: ["admin"] },

        { prefix: "/dashboard/driver", roles: ["driver"] },
        { prefix: "/dashboard/earnings", roles: ["driver"] },
        { prefix: "/dashboard/trips/active", roles: ["driver"] },

        { prefix: "/dashboard/farmer", roles: ["farmer", "fpo"] },
        { prefix: "/dashboard/loads", roles: ["farmer", "fpo", "admin"] },
        { prefix: "/dashboard/payments", roles: ["farmer", "fpo", "admin"] },
        { prefix: "/dashboard/mandi-prices", roles: ["farmer", "fpo", "admin", "driver"] },
        { prefix: "/dashboard/settings", roles: ["farmer", "fpo", "admin", "driver"] },
        { prefix: "/dashboard/notifications", roles: ["farmer", "fpo", "admin", "driver"] },
        { prefix: "/dashboard/price-alerts", roles: ["farmer", "fpo", "admin", "driver"] },
        { prefix: "/dashboard/ratings", roles: ["farmer", "fpo", "admin", "driver"] },
      ];

      const match = allow.find((r) => pathname.startsWith(r.prefix));
      if (match && !match.roles.includes(role)) {
        router.replace("/dashboard");
        return;
      }
    }

    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [hasHydrated, isAuthenticated, user, isLoadingUser, router, setUser, logout, accessToken, pathname, role]);

  if (!hasHydrated || !isAuthenticated || !user) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${DARK_THEME_BG}`}>
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-green-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex ${DARK_THEME_BG}`}>
      {!isMobile && (
        <Sidebar
          collapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      )}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          !isMobile && isSidebarCollapsed ? "ml-[68px]" : !isMobile ? "ml-[260px]" : ""
        }`}
      >
        <DashboardHeader onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
        <main className="flex-1 p-4 md:p-6 overflow-auto pb-24 md:pb-6">
          {children}
        </main>
      </div>
      {isMobile && <MobileNav />}
    </div>
  );
}