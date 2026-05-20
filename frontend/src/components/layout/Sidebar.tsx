"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Package, Plus, Truck, MapPin, Users,
  IndianRupee, BarChart3, Settings, Wheat, Clock, History, Wallet,
  ChevronLeft, ChevronRight,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["farmer", "driver", "admin", "fpo"] },
  { label: "New Request", href: "/dashboard/loads/new", icon: Plus, roles: ["farmer"] },
  { label: "My Loads", href: "/dashboard/loads", icon: Package, roles: ["farmer"] },
  { label: "My Trips", href: "/dashboard/trips", icon: Truck, roles: ["farmer"] },
  { label: "Payments", href: "/dashboard/payments", icon: IndianRupee, roles: ["farmer"] },
  { label: "Active Trips", href: "/dashboard/trips/active", icon: Truck, roles: ["driver"] },
  { label: "Trip History", href: "/dashboard/trips/history", icon: History, roles: ["driver"] },
  { label: "Earnings", href: "/dashboard/earnings", icon: Wallet, roles: ["driver"] },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3, roles: ["admin"] },
  { label: "Fleet", href: "/dashboard/fleet", icon: Truck, roles: ["admin"] },
  { label: "Mandis", href: "/dashboard/mandis", icon: MapPin, roles: ["admin"] },
  { label: "Users", href: "/dashboard/users", icon: Users, roles: ["admin"] },
  { label: "All Trips", href: "/dashboard/trips", icon: Clock, roles: ["admin"] },
  { label: "Revenue", href: "/dashboard/payments", icon: IndianRupee, roles: ["admin"] },
  { label: "Profile", href: "/dashboard/profile", icon: Settings, roles: ["farmer", "driver", "admin", "fpo"] },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const role = user?.role || "farmer";
  const filteredItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  const roleAccent: Record<string, string> = {
    farmer: "from-green-500 to-green-400",
    driver: "from-green-500 to-green-400",
    admin: "from-green-500 to-green-400",
    fpo: "from-green-500 to-green-400",
  };
  const roleBadge: Record<string, string> = {
    farmer: "text-green-400", driver: "text-green-400", admin: "text-green-400", fpo: "text-green-400",
  };
  const roleLabel: Record<string, string> = {
    farmer: "Farmer", driver: "Driver", admin: "Admin", fpo: "FPO",
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-full z-40 flex flex-col transition-all duration-300",
        collapsed ? "w-[68px]" : "w-[260px]"
      )}
      style={{ backgroundColor: "#0a1a0f" }}
    >
      {/* Subtle shine overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] via-transparent to-black/10 pointer-events-none" />

      {/* Logo */}
      <div className="relative flex items-center h-16 px-4 border-b border-[#1e4029] shrink-0">
        <div className={cn("rounded-xl p-2 shrink-0 bg-gradient-to-br shadow-lg", roleAccent[role])}>
          <Wheat className="h-4 w-4 text-gray-900" />
        </div>
        {!collapsed && (
          <div className="ml-3 overflow-hidden">
            <h1 className="text-white/90 font-bold text-lg leading-tight tracking-tight">Kisaan Mitr</h1>
            <p className={cn("text-xs font-medium", roleBadge[role])}>{roleLabel[role]} Panel</p>
          </div>
        )}
      </div>

      {/* Nav Items */}
      <nav className="relative flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              className={cn(
                "flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 group relative",
                isActive
                  ? "text-white shadow-md"
                  : "text-white/50 hover:text-white/80 hover:bg-white/[0.06]"
              )}
              title={collapsed ? item.label : undefined}
            >
              {/* Active background */}
              {isActive && (
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-600/30 to-emerald-500/10 border border-emerald-400/20" />
              )}
              {/* Active bar */}
              {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b from-green-400 to-green-500" />}

              <item.icon className={cn("h-5 w-5 shrink-0 relative z-10 transition-colors", isActive ? "text-emerald-300" : "group-hover:text-white/70")} />
              {!collapsed && <span className="ml-3 truncate relative z-10">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={onToggle}
        className="relative flex items-center justify-center h-12 border-t border-[#1e4029] text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all shrink-0"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </aside>
  );
}