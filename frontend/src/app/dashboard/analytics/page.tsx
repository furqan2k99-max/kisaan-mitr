"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAppStore";
import { useTrips, useLoadRequests, useTrucks } from "@/hooks/useApi";
import { formatCurrency, cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Truck, Package, Users, IndianRupee, BarChart3, MapPin } from "lucide-react";

const DARK_THEME_BG = "bg-[linear-gradient(135deg,#0d2d1a_0%,#0f2a1d_25%,#1a1200_75%,#1a1200_100%)]";
const GLASS_CARD = "border border-white/10 bg-white/5 backdrop-blur-xl rounded-2xl";

export default function AnalyticsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { data: trips } = useTrips();
  const { data: loads } = useLoadRequests();
  const { data: trucks } = useTrucks();

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "admin") {
      router.push("/login");
    }
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || user?.role !== "admin") return null;

  const completedTrips = trips?.filter((t) => t.status === "completed") || [];
  const activeTrips = trips?.filter((t) => t.status !== "completed" && t.status !== "cancelled") || [];
  const pendingLoads = loads?.filter((l) => l.status === "pending") || [];
  
  const totalRevenue = completedTrips.reduce((acc, t) => acc + (Number(t.total_fare) || 0), 0);
  const platformRevenue = totalRevenue * 0.12;
  
  const totalWeight = completedTrips.reduce((acc, t) => acc + (t.total_weight_kg || 0), 0);
  const avgTripWeight = completedTrips.length > 0 ? totalWeight / completedTrips.length : 0;
  
  const availableTrucks = trucks?.filter((t) => t.is_available).length || 0;

  // Analytics data
  const tripsByStatus = trips?.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const loadsByStatus = loads?.reduce((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const topMandis = completedTrips.reduce((acc, t) => {
    acc[t.mandi_destination] = (acc[t.mandi_destination] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topMandiEntries = Object.entries(topMandis).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className={cn("min-h-screen pb-24", DARK_THEME_BG)}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Analytics</h1>
        <p className="text-slate-400">Platform performance metrics</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={cn("border-l-4 border-blue-500", GLASS_CARD)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Trips</p>
                <p className="text-2xl font-bold text-blue-400">{trips?.length || 0}</p>
              </div>
              <Truck className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className={cn("border-l-4 border-green-500", GLASS_CARD)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Revenue</p>
                <p className="text-2xl font-bold text-amber-400">{formatCurrency(totalRevenue)}</p>
              </div>
              <IndianRupee className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className={cn("border-l-4 border-purple-500", GLASS_CARD)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Platform Fee (12%)</p>
                <p className="text-2xl font-bold text-purple-400">{formatCurrency(platformRevenue)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card className={cn("border-l-4 border-orange-500", GLASS_CARD)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Loads</p>
                <p className="text-2xl font-bold text-orange-400">{loads?.length || 0}</p>
              </div>
              <Package className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Trips by Status */}
        <Card className={GLASS_CARD}>
          <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg border-b border-white/10">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Trips by Status
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {Object.entries(tripsByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-full", 
                      status === "completed" ? "bg-green-500" :
                      status === "in_progress" ? "bg-orange-500" :
                      status === "scheduled" ? "bg-blue-500" : "bg-red-500")} />
                    <span className="capitalize text-slate-300">{status.replace("_", " ")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-white/10 rounded-full h-2">
                      <div className={cn("h-2 rounded-full", 
                        status === "completed" ? "bg-green-500" :
                        status === "in_progress" ? "bg-orange-500" :
                        status === "scheduled" ? "bg-blue-500" : "bg-red-500")}
                        style={{ width: `${(count / (trips?.length || 1)) * 100}%` }} />
                    </div>
                    <span className="font-medium w-8 text-right text-slate-300">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Loads by Status */}
        <Card className={GLASS_CARD}>
          <CardHeader className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-t-lg border-b border-white/10">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Loads by Status
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {Object.entries(loadsByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-full", 
                      status === "delivered" ? "bg-green-500" :
                      status === "pooled" ? "bg-blue-500" :
                      status === "in_transit" ? "bg-orange-500" :
                      status === "pending" ? "bg-yellow-500" : "bg-red-500")} />
                    <span className="capitalize text-slate-300">{status.replace("_", " ")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-white/10 rounded-full h-2">
                      <div className={cn("h-2 rounded-full", 
                        status === "delivered" ? "bg-green-500" :
                        status === "pooled" ? "bg-blue-500" :
                        status === "in_transit" ? "bg-orange-500" :
                        status === "pending" ? "bg-yellow-500" : "bg-red-500")}
                        style={{ width: `${(count / (loads?.length || 1)) * 100}%` }} />
                    </div>
                    <span className="font-medium w-8 text-right text-slate-300">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Mandis */}
        <Card className={GLASS_CARD}>
          <CardHeader className="bg-gradient-to-r from-green-600 to-green-500 text-white rounded-t-lg border-b border-white/10">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Top Destinations
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {topMandiEntries.length === 0 ? (
              <p className="text-center text-slate-400">No data yet</p>
            ) : (
              <div className="space-y-3">
                {topMandiEntries.map(([mandi, count], idx) => (
                  <div key={mandi} className="flex items-center justify-between p-2 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-xs font-medium">
                        {idx + 1}
                      </span>
                      <span className="text-slate-200">{mandi}</span>
                    </div>
                    <span className="font-semibold text-amber-400">{count} trips</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fleet Summary */}
        <Card className={GLASS_CARD}>
          <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-t-lg border-b border-white/10">
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Fleet Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                <p className="text-3xl font-bold text-purple-400">{trucks?.length || 0}</p>
                <p className="text-sm text-purple-400">Total Trucks</p>
              </div>
              <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                <p className="text-3xl font-bold text-green-400">{availableTrucks}</p>
                <p className="text-sm text-green-400">Available</p>
              </div>
              <div className="text-center p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <p className="text-3xl font-bold text-blue-400">{activeTrips.length}</p>
                <p className="text-sm text-blue-400">On Trip</p>
              </div>
              <div className="text-center p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                <p className="text-3xl font-bold text-yellow-400">{pendingLoads.length}</p>
                <p className="text-sm text-yellow-400">Pending Loads</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}