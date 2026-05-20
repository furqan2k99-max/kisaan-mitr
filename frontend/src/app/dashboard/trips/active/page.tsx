"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAppStore";
import { useTrips } from "@/hooks/useApi";
import { setAuthToken, tripApi } from "@/lib/api";
import { formatCurrency, formatDateTime, cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Truck, Package, MapPin, Clock, Navigation, IndianRupee, Play, CheckCircle2, Loader2 } from "lucide-react";

const DARK_THEME_BG = "bg-[linear-gradient(135deg,#0d2d1a_0%,#0f2a1d_25%,#1a1200_75%,#1a1200_100%)]";
const GLASS_CARD = "border border-white/10 bg-white/5 backdrop-blur-xl rounded-2xl";

export default function ActiveTripsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { data: trips, isLoading, refetch } = useTrips();
  const [startingTrip, setStartingTrip] = useState<string | null>(null);
  const [tripStarted, setTripStarted] = useState<string | null>(null);
  const [completingTrip, setCompletingTrip] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  const activeTrips = trips?.filter((t) => t.status === "scheduled" || t.status === "in_progress") || [];

  const handleStartTrip = async (tripId: string) => {
    try {
      setStartingTrip(tripId);
      await tripApi.updateStatus(tripId, "in_progress");
      refetch();
      router.push(`/dashboard/trips/${tripId}`);
    } catch (err: any) {
      console.error("Failed to start trip:", err);
      alert(err.response?.data?.detail || "Failed to start trip");
    } finally {
      setStartingTrip(null);
    }
  };

  const handleCompleteTrip = async (tripId: string) => {
    try {
      setStartingTrip(tripId);
      await tripApi.updateStatus(tripId, "completed");
      refetch();
      router.push("/dashboard/trips");
    } catch (err: any) {
      console.error("Failed to complete trip:", err);
      alert(err.response?.data?.detail || "Failed to complete trip");
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Pickup Queue</h1>
        <p className="text-slate-400">Your assigned trips ready for pickup</p>
      </div>

      {/* Active Trips */}
      <Card className={GLASS_CARD}>
        <CardHeader className="bg-gradient-to-r from-green-700 to-emerald-600 text-white rounded-t-lg border-b border-white/10">
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Active Trips ({activeTrips.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
            </div>
          ) : activeTrips.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Truck className="h-16 w-16 mb-4 text-slate-600" />
              <p className="text-lg font-medium text-slate-300">No active trips</p>
              <p className="text-sm">Check back soon for new assignments</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeTrips.map((trip) => (
                <div key={trip.id} className="border border-white/10 rounded-2xl p-5 hover:bg-white/5 transition-all hover:border-green-500/30">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-500/20 rounded-lg">
                        <Truck className="h-6 w-6 text-orange-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-slate-100">{trip.mandi_destination}</h3>
                        <span className={cn("px-2 py-0.5 rounded text-xs font-medium", 
                          trip.status === "scheduled" ? "bg-blue-500/20 text-blue-400" : "bg-orange-500/20 text-orange-400")}>
                          {trip.status.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                    {trip.truck && (
                      <div className="text-right text-sm">
                        <p className="font-medium text-slate-200">{trip.truck.registration_number}</p>
                        <p className="text-slate-500">{trip.truck.truck_type}</p>
                      </div>
                    )}
                  </div>

                  {/* Trip Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-3 bg-white/5 rounded-lg border border-white/10">
                    <div>
                      <p className="text-xs text-slate-500">Weight</p>
                      <p className="font-semibold text-slate-200">{trip.total_weight_kg}kg</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Distance</p>
                      <p className="font-semibold text-slate-200">{trip.total_distance_km}km</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Fare</p>
                      <p className="font-semibold text-amber-400">{formatCurrency(trip.total_fare)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Pickup</p>
                      <p className="font-semibold text-sm text-slate-200">{trip.scheduled_pickup_start ? formatDateTime(trip.scheduled_pickup_start) : "—"}</p>
                    </div>
                  </div>

                  {/* Pickup Sequence */}
                  {trip.trip_loads && trip.trip_loads.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-slate-300 mb-2">Pickup Sequence:</p>
                      <div className="space-y-2">
                        {trip.trip_loads
                          .sort((a, b) => (a.pickup_sequence || 0) - (b.pickup_sequence || 0))
                          .map((load, idx) => (
                            <div key={load.load_request_id} className="flex items-center gap-3 p-2 bg-white/5 border border-white/10 rounded-lg">
                              <span className="w-6 h-6 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-sm font-medium">
                                {idx + 1}
                              </span>
                              <MapPin className="h-4 w-4 text-slate-500" />
                              <span className="flex-1 text-sm text-slate-300">{load.load_request?.origin_address || "Pickup point"}</span>
                              <span className="text-sm text-slate-500">{load.allocated_weight_kg}kg</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3">
                    {trip.status === "scheduled" && (
                      <Button 
                        onClick={() => handleStartTrip(trip.id)}
                        disabled={startingTrip === trip.id || tripStarted === trip.id}
                        className="bg-gradient-to-r from-green-600 to-green-500 shadow-lg shadow-green-500/30"
                      >
                        {startingTrip === trip.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : tripStarted === trip.id ? (
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                        ) : (
                          <Play className="mr-2 h-4 w-4" />
                        )}
                        {tripStarted === trip.id ? "Trip Started" : "Start Trip"}
                      </Button>
                    )}
                    {trip.status === "in_progress" && (
                      <Button 
                        onClick={() => handleCompleteTrip(trip.id)}
                        disabled={completingTrip === trip.id}
                        className="bg-gradient-to-r from-green-600 to-green-500 shadow-lg shadow-green-500/30"
                      >
                        {completingTrip === trip.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                        )}
                        {completingTrip === trip.id ? "Completing..." : "Complete Delivery"}
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      className="border-white/20 text-slate-300 hover:bg-white/10"
                      onClick={() => handleViewRoute(trip)}
                    >
                      <Navigation className="mr-2 h-4 w-4" />View Route
                    </Button>
                  </div>
                  {tripStarted === trip.id && (
                    <p className="text-green-400 text-sm mt-2">✓ Trip started successfully!</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}