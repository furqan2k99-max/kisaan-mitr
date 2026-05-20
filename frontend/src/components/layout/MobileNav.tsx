"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Package, Truck, Wallet, User,
  BarChart3, MapPin, Plus, History, TrendingUp,
} from "lucide-react";

const farmerItems = [
  { href: "/dashboard/farmer", icon: LayoutDashboard, label: "Home" },
  { href: "/dashboard/trips", icon: Truck, label: "Trips" },
  { href: "/dashboard/loads/new", icon: Plus, label: "New", accent: true },
  { href: "/dashboard/mandi-prices", icon: TrendingUp, label: "Prices" },
  { href: "/dashboard/profile", icon: User, label: "Profile" },
];

const driverItems = [
  { href: "/dashboard/driver", icon: LayoutDashboard, label: "Home" },
  { href: "/dashboard/trips/active", icon: Truck, label: "Active" },
  { href: "/dashboard/trips", icon: History, label: "History" },
  { href: "/dashboard/earnings", icon: Wallet, label: "Earnings" },
  { href: "/dashboard/profile", icon: User, label: "Profile" },
];

const adminItems = [
  { href: "/dashboard/admin", icon: LayoutDashboard, label: "Home" },
  { href: "/dashboard/analytics", icon: BarChart3, label: "Stats" },
  { href: "/dashboard/fleet", icon: Truck, label: "Fleet" },
  { href: "/dashboard/mandis", icon: MapPin, label: "Mandis" },
  { href: "/dashboard/profile", icon: User, label: "Profile" },
];

export function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const role = user?.role || "farmer";

  const items = role === "admin" ? adminItems : role === "driver" ? driverItems : farmerItems;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-2 pb-2">
      <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-2xl shadow-lg shadow-slate-900/5 flex justify-around items-center h-16 px-1">
        {items.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard/farmer" &&
              item.href !== "/dashboard/driver" &&
              item.href !== "/dashboard/admin" &&
              pathname.startsWith(item.href));

          const isAccent = "accent" in item && item.accent;

          if (isAccent) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center -mt-4"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 shadow-lg shadow-emerald-200 flex items-center justify-center">
                  <item.icon className="h-5 w-5 text-white" />
                </div>
                <span className="text-[10px] mt-0.5 font-medium text-emerald-700">{item.label}</span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full transition-colors",
                isActive ? "text-emerald-700" : "text-slate-400"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "text-emerald-600")} />
              <span className={cn("text-[10px] mt-0.5", isActive ? "font-semibold" : "font-medium")}>
                {item.label}
              </span>
              {isActive && <div className="w-1 h-1 rounded-full bg-emerald-500 mt-0.5" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}