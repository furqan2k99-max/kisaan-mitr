"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAppStore";
import { useTrips } from "@/hooks/useApi";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IndianRupee, Truck, TrendingUp, Calendar, Loader2 } from "lucide-react";

const DARK_THEME_BG = "bg-[linear-gradient(135deg,#0d2d1a_0%,#0f2a1d_25%,#1a1200_75%,#1a1200_100%)]";
const GLASS_CARD = "border border-white/10 bg-white/5 backdrop-blur-xl rounded-2xl";

export default function EarningsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { data: trips, isLoading } = useTrips();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  const completedTrips = trips?.filter((t) => t.status === "completed") || [];
  
  const totalEarnings = completedTrips.reduce((acc, t) => acc + (Number(t.total_fare) || 0), 0);
  const thisMonthEarnings = completedTrips
    .filter((t) => {
      if (!t.created_at) return false;
      const tripDate = new Date(t.created_at);
      const now = new Date();
      return tripDate.getMonth() === now.getMonth() && tripDate.getFullYear() === now.getFullYear();
    })
    .reduce((acc, t) => acc + (Number(t.total_fare) || 0), 0);
  
  const avgPerTrip = completedTrips.length > 0 ? totalEarnings / completedTrips.length : 0;

  // Group by month
  const earningsByMonth = completedTrips.reduce((acc, trip) => {
    if (!trip.created_at) return acc;
    const month = new Date(trip.created_at).toLocaleString("default", { month: "short", year: "numeric" });
    acc[month] = (acc[month] || 0) + (Number(trip.total_fare) || 0);
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className={cn("min-h-screen pb-24", DARK_THEME_BG)}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Earnings</h1>
        <p className="text-slate-400">Your trip earnings summary</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className={cn("border-l-4 border-green-500", GLASS_CARD)}>
          <CardContent className="p-4 text-center">
            <IndianRupee className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-amber-400">{formatCurrency(totalEarnings)}</p>
            <p className="text-sm text-slate-400">Total Earnings</p>
          </CardContent>
        </Card>
        <Card className={cn("border-l-4 border-blue-500", GLASS_CARD)}>
          <CardContent className="p-4 text-center">
            <Calendar className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-amber-400">{formatCurrency(thisMonthEarnings)}</p>
            <p className="text-sm text-slate-400">This Month</p>
          </CardContent>
        </Card>
        <Card className={cn("border-l-4 border-purple-500", GLASS_CARD)}>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-8 w-8 text-purple-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-amber-400">{formatCurrency(avgPerTrip)}</p>
            <p className="text-sm text-slate-400">Avg per Trip</p>
          </CardContent>
        </Card>
        <Card className={cn("border-l-4 border-orange-500", GLASS_CARD)}>
          <CardContent className="p-4 text-center">
            <Truck className="h-8 w-8 text-orange-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-100">{completedTrips.length}</p>
            <p className="text-sm text-slate-400">Total Trips</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Breakdown */}
      <Card className={GLASS_CARD}>
        <CardHeader className="bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-t-lg border-b border-white/10">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Monthly Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : Object.keys(earningsByMonth).length === 0 ? (
            <p className="text-center text-slate-400 py-8">No completed trips yet</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(earningsByMonth).sort((a, b) => b[0].localeCompare(a[0])).map(([month, amount]) => (
                <div key={month} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                  <span className="font-medium text-slate-200">{month}</span>
                  <span className="font-semibold text-amber-400">{formatCurrency(amount)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trip History */}
      <Card className={GLASS_CARD}>
        <CardHeader className="bg-gradient-to-r from-green-600 to-green-500 text-white rounded-t-lg border-b border-white/10">
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Completed Trips
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {completedTrips.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Truck className="h-16 w-16 mb-4 text-slate-600" />
              <p>No completed trips yet</p>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {completedTrips.slice(0, 10).map((trip) => (
                <div key={trip.id} className="p-4 flex items-center justify-between hover:bg-white/5">
                  <div>
                    <p className="font-medium text-slate-100">{trip.mandi_destination}</p>
                    <p className="text-sm text-slate-400">{trip.total_weight_kg}kg • {trip.total_distance_km}km</p>
                    {trip.created_at && <p className="text-xs text-slate-500">{formatDate(trip.created_at)}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-amber-400">{formatCurrency(trip.total_fare)}</p>
                    <p className="text-xs text-slate-500">{trip.trip_loads?.length || 0} pickups</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}