"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAppStore";
import { useTrips } from "@/hooks/useApi";
import { tripApi, driverApi } from "@/lib/api";
import { formatCurrency, formatDateTime, cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Truck, Package, MapPin, Clock, Navigation, IndianRupee, CheckCircle2, Loader2, AlertCircle, Wifi, WifiOff } from "lucide-react";

const DARK_THEME_BG = "bg-[#0f2318]";
const GLASS_CARD = "border border-[#1e4029] bg-[#162d1e] rounded-2xl";

export default function DriverDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { data: trips, isLoading, refetch } = useTrips();
  const [startingTrip, setStartingTrip] = useState<string | null>(null);
  const [tripStarted, setTripStarted] = useState<string | null>(null);
  const [driverOnline, setDriverOnline] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    fetchDriverStatus();
  }, []);

  const fetchDriverStatus = async () => {
    try {
      const status = await driverApi.getStatus();
      setDriverOnline(status.online);
    } catch (error) {
      console.error("Failed to fetch driver status:", error);
    }
  };

  const toggleDriverStatus = async () => {
    setUpdatingStatus(true);
    try {
      await driverApi.updateStatus({ online: !driverOnline });
      setDriverOnline(!driverOnline);
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
  }, [isAuthenticated, router]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  if (!isAuthenticated) return null;

  const activeTrips = trips?.filter((t) => t.status === "scheduled" || t.status === "in_progress") || [];
  const completedTrips = trips?.filter((t) => t.status === "completed") || [];

  const totalEarnings = completedTrips.reduce((acc, t) => acc + (Number(t.total_fare) || 0), 0);
  const totalDeliveries = completedTrips.length;

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      in_progress: "bg-orange-500/20 text-orange-400 border-orange-500/30",
      completed: "bg-green-500/20 text-green-400 border-green-500/30",
      cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
    };
    return colors[status] || "bg-gray-500/20 text-gray-400 border-slate-500/30";
  };

  const handleStartTrip = async (tripId: string) => {
    try {
      setStartingTrip(tripId);
      await tripApi.updateStatus(tripId, "in_progress");
      setTripStarted(tripId);
      refetch();
      router.push(`/dashboard/trips/${tripId}`);
    } catch (err: any) {
      console.error("Failed to start trip:", err);
      alert(err.response?.data?.detail || "Failed to start trip");
    } finally {
      setStartingTrip(null);
    }
  };

  const handleViewRoute = (trip: typeof activeTrips[0]) => {
    const destination = encodeURIComponent(trip.mandi_destination);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${destination}`, '_blank');
  };

  return (
    <div className={cn("min-h-screen pb-24", DARK_THEME_BG)}>
      {/* Driver Availability Toggle */}
      <div className="mb-6 p-4 rounded-2xl border border-[#1e4029] bg-[#162d1e] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center",
            driverOnline ? "bg-green-500/20" : "bg-gray-600/20"
          )}>
            {driverOnline ? (
              <Wifi className="h-6 w-6 text-green-400" />
            ) : (
              <WifiOff className="h-6 w-6 text-gray-400" />
            )}
          </div>
          <div>
            <p className="text-white font-medium">
              {driverOnline ? "You're Online" : "You're Offline"}
            </p>
            <p className="text-gray-400 text-sm">
              {driverOnline ? "Available for new trips" : "Not receiving trip requests"}
            </p>
          </div>
        </div>
        <button
          onClick={toggleDriverStatus}
          disabled={updatingStatus}
          className={cn(
            "px-6 py-3 rounded-xl font-medium transition-all",
            driverOnline 
              ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" 
              : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
          )}
        >
          {updatingStatus ? "Updating..." : driverOnline ? "Go Offline" : "Go Online"}
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={GLASS_CARD}>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-green-400">{activeTrips.length}</p>
            <p className="text-sm text-gray-400">Active Trips</p>
          </CardContent>
        </Card>
        <Card className={GLASS_CARD}>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-green-400">{totalDeliveries}</p>
            <p className="text-sm text-gray-400">Completed</p>
          </CardContent>
        </Card>
        <Card className={GLASS_CARD}>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-amber-400">{formatCurrency(totalEarnings)}</p>
            <p className="text-sm text-gray-400">Total Earnings</p>
          </CardContent>
        </Card>
        <Card className={GLASS_CARD}>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-purple-400">{trips?.length || 0}</p>
            <p className="text-sm text-gray-400">Total Trips</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Trips */}
      <Card className={GLASS_CARD}>
        <CardHeader className="bg-gradient-to-r from-green-700 to-emerald-600 text-white rounded-t-lg border-b border-white/10">
          <CardTitle className="flex items-center space-x-2">
            <Truck className="h-5 w-5" />
            <span>Pickup Queue</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-green-500" /></div>
          ) : activeTrips.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Truck className="h-16 w-16 mx-auto mb-4 text-slate-600" />
              <p className="text-lg font-medium text-slate-300">No active trips</p>
              <p className="text-sm">Check back soon for new assignments</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeTrips.map((trip) => (
                <div key={trip.id} className="border border-white/10 rounded-lg p-4 hover:bg-white/5 transition-all hover:border-green-500/30">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-lg text-slate-100">{trip.mandi_destination}</span>
                      <span className={cn("px-2 py-1 rounded text-xs font-medium border", getStatusColor(trip.status))}>
                        {trip.status.replace("_", " ")}
                      </span>
                    </div>
                    {trip.truck && <span className="text-sm text-gray-400">{trip.truck.registration_number}</span>}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-gray-400" />
                      <span className="text-slate-300">{trip.total_weight_kg}kg</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Navigation className="h-4 w-4 text-gray-400" />
                      <span className="text-slate-300">{trip.total_distance_km} km</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <IndianRupee className="h-4 w-4 text-gray-400" />
                      <span className="text-amber-400">{formatCurrency(trip.total_fare || 0)}</span>
                    </div>
                    {trip.scheduled_pickup_start && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-slate-300">{formatDateTime(trip.scheduled_pickup_start)}</span>
                      </div>
                    )}
                  </div>

                  {trip.trip_loads && trip.trip_loads.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-white/10">
                      <p className="text-xs font-medium text-gray-400 mb-2">Pickup sequence:</p>
                      <div className="space-y-2">
                        {trip.trip_loads
                          .sort((a, b) => (a.pickup_sequence || 0) - (b.pickup_sequence || 0))
                          .map((load, idx) => (
                            <div key={load.load_request_id} className="flex items-center gap-2 text-sm">
                              <span className="w-6 h-6 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-xs font-medium">
                                {idx + 1}
                              </span>
                              <MapPin className="h-3 w-3 text-slate-500" />
                              <span className="text-slate-300">
                                {load.load_request?.origin_address || "Pickup point"}
                              </span>
                              <span className="text-slate-500">({load.allocated_weight_kg}kg)</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {trip.status === "scheduled" && (
                    <div className="mt-4 flex gap-2">
                      <Button 
                        size="sm" 
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleStartTrip(trip.id)}
                        disabled={startingTrip === trip.id || tripStarted === trip.id}
                      >
                        {startingTrip === trip.id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : tripStarted === trip.id ? (
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                        ) : null}
                        {tripStarted === trip.id ? "Trip Started" : "Start Trip"}
                      </Button>
                      <Button size="sm" variant="outline" className="border-white/20 text-slate-300 hover:bg-white/10" onClick={() => handleViewRoute(trip)}>
                        View Route
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Completed Trips */}
      {completedTrips.length > 0 && (
        <Card className={GLASS_CARD}>
          <CardHeader className="bg-gradient-to-r from-green-700 to-emerald-600 text-white rounded-t-lg border-b border-white/10">
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5" />
              <span>Recent Deliveries</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {completedTrips.slice(0, 5).map((trip) => (
                <div key={trip.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                  <div>
                    <p className="font-medium text-slate-100">{trip.mandi_destination}</p>
                    <p className="text-sm text-gray-400">{trip.total_weight_kg}kg • {trip.total_distance_km}km</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-400">{formatCurrency(trip.total_fare || 0)}</p>
                    <p className="text-xs text-slate-500">{trip.trip_loads?.length || 0} pickups</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}