"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAppStore";
import { useTrips } from "@/hooks/useApi";
import { formatCurrency, formatDateTime, cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Truck, Package, MapPin, Clock, Navigation, IndianRupee, Loader2, AlertCircle, Filter } from "lucide-react";

const DARK_THEME_BG = "bg-[linear-gradient(135deg,#0d2d1a_0%,#0f2a1d_25%,#1a1200_75%,#1a1200_100%)]";
const GLASS_CARD = "border border-white/10 bg-white/5 backdrop-blur-xl rounded-2xl";

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  in_progress: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function TripsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { data: trips, isLoading, error } = useTrips();
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  const filteredTrips = trips?.filter((trip) => {
    const matchesFilter = filter === "all" || trip.status === filter;
    const matchesSearch = !search || trip.mandi_destination.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  }) || [];

  const statusCounts = trips?.reduce((acc, trip) => {
    acc[trip.status] = (acc[trip.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <div className={cn("min-h-screen pb-24", DARK_THEME_BG)}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Trips</h1>
        <p className="text-slate-400">View all trip activity</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <button
          onClick={() => setFilter("all")}
          className={cn("p-3 rounded-lg text-center border-2 transition-all", filter === "all" ? "border-green-500 bg-green-500/20" : "border-white/10 hover:border-green-500/30")}
        >
          <p className="text-2xl font-bold text-slate-100">{trips?.length || 0}</p>
          <p className="text-xs text-slate-400">All</p>
        </button>
        {Object.entries(statusCounts).map(([status, count]) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={cn("p-3 rounded-lg text-center border-2 transition-all", filter === status ? "border-green-500 bg-green-500/20" : "border-white/10 hover:border-green-500/30")}
          >
            <p className="text-2xl font-bold text-slate-100">{count}</p>
            <p className="text-xs text-slate-400 capitalize">{status.replace("_", " ")}</p>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search by destination..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Trips List */}
      <Card className={GLASS_CARD}>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-green-500" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-red-400">
              <AlertCircle className="h-8 w-8 mb-2" />
              <p>Failed to load trips</p>
            </div>
          ) : filteredTrips.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Truck className="h-16 w-16 mb-4 text-slate-600" />
              <p className="text-lg font-medium text-slate-300">No trips found</p>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {filteredTrips.map((trip) => (
                <div key={trip.id} className="p-4 hover:bg-white/5 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-orange-500/20">
                        <Truck className="h-5 w-5 text-orange-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-100">{trip.mandi_destination}</h3>
                          <span className={cn("px-2 py-0.5 rounded text-xs font-medium border", statusColors[trip.status])}>
                            {trip.status.replace("_", " ")}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                          <span className="flex items-center gap-1"><Package className="h-3 w-3" />{trip.total_weight_kg}kg</span>
                          <span className="flex items-center gap-1"><Navigation className="h-3 w-3" />{trip.total_distance_km}km</span>
                          <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3" />{formatCurrency(trip.total_fare)}</span>
                        </div>
                        {trip.scheduled_pickup_start && (
                          <p className="text-xs text-slate-500 mt-1">Pickup: {formatDateTime(trip.scheduled_pickup_start)}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {trip.trip_loads && (
                        <span className="text-sm text-slate-400">{trip.trip_loads.length} loads</span>
                      )}
                      <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/trips/${trip.id}`)} className="border-white/20 text-slate-300 hover:bg-white/10">
                        View
                      </Button>
                    </div>
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