"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAppStore";
import { useTrips, useLoadRequests, useTrucks } from "@/hooks/useApi";
import { formatCurrency, cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, Package, Users, IndianRupee, TrendingUp, MapPin, BarChart3 } from "lucide-react";

const PASTEL_GREEN_BG = "bg-[linear-gradient(135deg,#f0fdf4_0%,#dcfce7_20%,#bbf7d0_40%,#fef9c3_60%,#dcfce7_80%,#f0fdf4_100%)]";
const GLASS_CARD = "bg-white/70 backdrop-blur-xl";
const GLASS_HEADER = "bg-white/80 backdrop-blur-xl";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { data: trips } = useTrips();
  const { data: loads } = useLoadRequests();
  const { data: trucks } = useTrucks();

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "admin") {
      router.push("/login");
      return;
    }
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || user?.role !== "admin") return null;

  const activeTrips = trips?.filter((t) => t.status !== "completed" && t.status !== "cancelled").length || 0;
  const completedTrips = trips?.filter((t) => t.status === "completed").length || 0;
  const totalRevenue = trips?.filter((t) => t.status === "completed").reduce((acc, t) => acc + (Number(t.total_fare) || 0), 0) || 0;
  const pendingLoads = loads?.filter((l) => l.status === "pending").length || 0;
  const availableTrucks = trucks?.filter((t) => t.is_available).length || 0;
  const totalTrucks = trucks?.length || 0;

  const platformRevenue = totalRevenue * 0.12;

  return (
    <div className={cn("min-h-screen pb-24", PASTEL_GREEN_BG)}>
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={cn("border-l-4 border-blue-500", GLASS_CARD)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Trips</p>
                <p className="text-2xl font-bold text-blue-600">{activeTrips}</p>
              </div>
              <Truck className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className={cn("border-l-4 border-green-500", GLASS_CARD)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Completed Trips</p>
                <p className="text-2xl font-bold text-green-600">{completedTrips}</p>
              </div>
              <Package className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className={cn("border-l-4 border-purple-500", GLASS_CARD)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(totalRevenue)}</p>
              </div>
              <IndianRupee className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card className={cn("border-l-4 border-orange-500", GLASS_CARD)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Platform Fee (12%)</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(platformRevenue)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Fleet Status */}
        <Card className={GLASS_CARD}>
          <CardHeader className={cn("bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-t-lg", GLASS_HEADER)}>
            <CardTitle className="flex items-center space-x-2">
              <Truck className="h-5 w-5" />
              <span>Fleet Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Available Trucks</span>
                <span className="font-semibold text-green-600">{availableTrucks} / {totalTrucks}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${totalTrucks ? (availableTrucks / totalTrucks) * 100 : 0}%` }}></div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-gray-600">Pending Loads</span>
                <span className="font-semibold text-yellow-600">{pendingLoads}</span>
              </div>
            </div>
            <div className="mt-4">
              <a href="/dashboard/fleet" className="text-sm text-blue-600 hover:underline">Manage Fleet →</a>
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card className={GLASS_CARD}>
          <CardHeader className={cn("bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg", GLASS_HEADER)}>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Quick Actions</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-2">
              <a href="/dashboard/analytics" className="block p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors">
                <span className="font-medium text-blue-700">View Analytics</span>
              </a>
              <a href="/dashboard/users" className="block p-3 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors">
                <span className="font-medium text-purple-700">Manage Users</span>
              </a>
              <a href="/dashboard/mandis" className="block p-3 rounded-lg bg-green-50 hover:bg-green-100 transition-colors">
                <span className="font-medium text-green-700">Manage Mandis</span>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className={GLASS_CARD}>
          <CardHeader className={cn("bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-lg", GLASS_HEADER)}>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <span>Recent Loads</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {loads?.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No recent loads</p>
            ) : (
              <div className="space-y-3">
                {loads?.slice(0, 5).map((load) => (
                  <div key={load.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium capitalize">{load.crop_type}</p>
                      <p className="text-gray-400">{load.weight_kg}kg → {load.destination_mandi}</p>
                    </div>
                    <span className={cn("px-2 py-1 rounded text-xs font-medium", 
                      load.status === "pending" && "bg-yellow-100 text-yellow-800",
                      load.status === "pooled" && "bg-blue-100 text-blue-800",
                      load.status === "delivered" && "bg-green-100 text-green-800",
                    )}>
                      {load.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}