"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAppStore";
import { useCurrentUser } from "@/hooks/useApi";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Users, Search, Loader2, User, Phone, Mail } from "lucide-react";

const DARK_THEME_BG = "bg-[linear-gradient(135deg,#0d2d1a_0%,#0f2a1d_25%,#1a1200_75%,#1a1200_100%)]";
const GLASS_CARD = "border border-white/10 bg-white/5 backdrop-blur-xl rounded-2xl";

const roleColors: Record<string, string> = {
  farmer: "bg-green-500/20 text-green-400",
  driver: "bg-blue-500/20 text-blue-400",
  admin: "bg-purple-500/20 text-purple-400",
  fpo: "bg-orange-500/20 text-orange-400",
};

export default function UsersPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { data: currentUser } = useCurrentUser();
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "admin") {
      router.push("/login");
    }
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || user?.role !== "admin") return null;

  // Mock user data - in real app would come from API
  const mockUsers = [
    { id: "1", full_name: "Ramesh Kumar", phone: "9876543210", role: "farmer", is_active: true },
    { id: "2", full_name: "Suresh Patil", phone: "9876543211", role: "farmer", is_active: true },
    { id: "3", full_name: "Mahesh Driver", phone: "9876543212", role: "driver", is_active: true },
    { id: "4", full_name: "Admin User", phone: "9876543213", role: "admin", is_active: true },
    { id: "5", full_name: "FPO User", phone: "9876543214", role: "fpo", is_active: true },
  ];

  const filteredUsers = mockUsers.filter((u) => 
    !search || u.full_name.toLowerCase().includes(search.toLowerCase()) || 
    u.phone.includes(search)
  );

  const usersByRole = mockUsers.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className={cn("min-h-screen pb-24", DARK_THEME_BG)}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Users</h1>
        <p className="text-slate-400">Manage platform users</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(usersByRole).map(([role, count]) => (
          <Card key={role} className={GLASS_CARD}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-slate-100 capitalize">{count}</p>
              <p className="text-sm text-slate-400 capitalize">{role}s</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <Input
          placeholder="Search by name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500"
        />
      </div>

      {/* Users List */}
      <Card className={GLASS_CARD}>
        <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg border-b border-white/10">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Users
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-white/10">
            {filteredUsers.map((u) => (
              <div key={u.id} className="p-4 hover:bg-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-slate-400" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-100">{u.full_name}</p>
                      <div className="flex items-center gap-3 text-sm text-slate-400">
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{u.phone}</span>
                      </div>
                    </div>
                  </div>
                  <span className={cn("px-2 py-1 rounded text-xs font-medium capitalize", roleColors[u.role])}>
                    {u.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}