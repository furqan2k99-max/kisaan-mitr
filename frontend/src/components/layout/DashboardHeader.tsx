"use client";

import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAppStore";
import { setAuthToken } from "@/lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Wheat, User, Settings, LogOut, PanelLeftClose, Bell } from "lucide-react";

const roleConfig: Record<string, { color: string; bg: string; label: string }> = {
  farmer: { color: "text-emerald-600", bg: "bg-emerald-600", label: "Farmer" },
  driver: { color: "text-blue-600", bg: "bg-blue-600", label: "Driver" },
  admin: { color: "text-purple-600", bg: "bg-purple-600", label: "Admin" },
  fpo: { color: "text-orange-600", bg: "bg-orange-600", label: "FPO" },
};

const routeTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/farmer": "Dashboard",
  "/dashboard/driver": "Dashboard",
  "/dashboard/admin": "Dashboard",
  "/dashboard/loads": "My Loads",
  "/dashboard/loads/new": "New Request",
  "/dashboard/trips": "Trips",
  "/dashboard/trips/active": "Active Trips",
  "/dashboard/trips/history": "Trip History",
  "/dashboard/payments": "Payments",
  "/dashboard/earnings": "Earnings",
  "/dashboard/analytics": "Analytics",
  "/dashboard/fleet": "Fleet",
  "/dashboard/mandis": "Mandis",
  "/dashboard/users": "Users",
  "/dashboard/profile": "Profile",
};

interface DashboardHeaderProps {
  onToggleSidebar?: () => void;
}

export function DashboardHeader({ onToggleSidebar }: DashboardHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    setAuthToken(null);
    router.push("/login");
  };

  const rc = roleConfig[user?.role || "farmer"];
  const initials =
    user?.full_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U";

  const pageTitle = routeTitles[pathname] || "Dashboard";

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#0f2318]/95 backdrop-blur-xl border-b border-[#1e4029] flex items-center px-4 md:px-6 shrink-0">
      {/* Sidebar toggle */}
      {onToggleSidebar && (
        <button
          onClick={onToggleSidebar}
          className="hidden md:flex mr-4 p-2 rounded-xl hover:bg-[#162d1e] transition-colors"
          title="Toggle sidebar"
        >
          <PanelLeftClose className="h-5 w-5 text-gray-400" />
        </button>
      )}

      {/* Mobile logo */}
      <div className="md:hidden flex items-center gap-2">
        <div className={cn("rounded-xl p-1.5", rc.bg)}>
          <Wheat className="h-4 w-4 text-white" />
        </div>
      </div>

      {/* Page title */}
      <h2 className="hidden md:block text-lg font-semibold text-white">{pageTitle}</h2>

      <div className="flex-1" />

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <button 
          onClick={() => router.push("/dashboard/notifications")}
          className="relative p-2 rounded-xl hover:bg-[#162d1e] transition-colors"
        >
          <Bell className="h-5 w-5 text-gray-400" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-[#0f2318]" />
        </button>

        {/* Role badge */}
        <span
          className={cn(
            "hidden md:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#162d1e]",
            rc.color
          )}
        >
          {rc.label}
        </span>

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-[#162d1e] transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarFallback className={cn("text-sm font-medium", rc.bg, "text-white")}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden md:block text-sm font-medium text-gray-200 max-w-[120px] truncate">
                {user?.full_name}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-[#162d1e] border-[#1e4029]">
            <div className="px-3 py-2 border-b border-[#1e4029]">
              <p className="text-sm font-medium text-white">{user?.full_name}</p>
              <p className="text-xs text-gray-400">{user?.phone}</p>
            </div>
            <DropdownMenuItem onClick={() => router.push("/dashboard/profile")} className="text-gray-300 hover:bg-[#1a3524]">
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/dashboard/profile")} className="text-gray-300 hover:bg-[#1a3524]">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#1e4029]" />
            <DropdownMenuItem onClick={handleLogout} className="text-red-400 hover:bg-[#1a3524]">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}