"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuthStore } from "@/store/useAppStore";
import { useTrip } from "@/hooks/useApi";
import { formatCurrency, formatDate, formatDateTime, cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Truck, MapPin, Package, Users, Navigation, Route, Clock, Car } from "lucide-react";

const DARK_THEME_BG = "bg-[linear-gradient(135deg,#0d2d1a_0%,#0f2a1d_25%,#1a1200_75%,#1a1200_100%)]";
const GLASS_CARD = "border border-white/10 bg-white/5 backdrop-blur-xl rounded-2xl";

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  in_progress: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function TripDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { isAuthenticated } = useAuthStore();
  const tripId = params.id as string;
  
  const { data: trip, isLoading, error } = useTrip(tripId);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  return (
    <div className={cn("min-h-screen p-6", DARK_THEME_BG)}>
      <div className="max-w-4xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => router.push("/dashboard/trips")}
          className="mb-6 text-slate-300 hover:text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />Back to Trips
        </Button>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-green-500" />
          </div>
        ) : error ? (
          <Card className={GLASS_CARD}>
            <CardContent className="py-12 text-center text-red-400">
              Failed to load trip details
            </CardContent>
          </Card>
        ) : trip ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">Trip to {trip.mandi_destination}</h1>
                <span className={cn("px-3 py-1 rounded-full text-sm font-medium border inline-block mt-2", statusColors[trip.status])}>
                  {trip.status.replace("_", " ")}
                </span>
              </div>
              {trip.status === "scheduled" && (
                <Button className="bg-gradient-to-r from-orange-500 to-orange-600">
                  <Clock className="mr-2 h-4 w-4" />Track Live
                </Button>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className={GLASS_CARD}>
                <CardHeader className="border-b border-white/10">
                  <CardTitle className="text-lg text-slate-200">Trip Summary</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-sm text-slate-400">Total Weight</p>
                      <p className="text-slate-100 font-medium">{trip.total_weight_kg} kg</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Navigation className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-sm text-slate-400">Distance</p>
                      <p className="text-slate-100 font-medium">{trip.total_distance_km} km</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-sm text-slate-400">Farmers Pooled</p>
                      <p className="text-slate-100 font-medium">{trip.trip_loads?.length || 0}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Route className="h-5 w-5 text-amber-500" />
                    <div>
                      <p className="text-sm text-slate-400">Base Fare</p>
                      <p className="text-slate-100 font-medium">{formatCurrency(trip.base_fare || 0)}</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-white/10">
                    <p className="text-sm text-slate-400">Total Fare</p>
                    <p className="text-amber-400 text-xl font-semibold">{formatCurrency(trip.total_fare || 0)}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className={GLASS_CARD}>
                <CardHeader className="border-b border-white/10">
                  <CardTitle className="text-lg text-slate-200">Schedule</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-orange-500" />
                    <div>
                      <p className="text-sm text-slate-400">Pickup Window</p>
                      <p className="text-slate-100 font-medium">
                        {trip.scheduled_pickup_start ? formatDateTime(trip.scheduled_pickup_start) : "Not scheduled"}
                      </p>
                    </div>
                  </div>
                  {trip.estimated_arrival && (
                    <div className="flex items-center gap-3">
                      <Truck className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="text-sm text-slate-400">ETA at Mandi</p>
                        <p className="text-slate-100 font-medium">{formatDateTime(trip.estimated_arrival)}</p>
                      </div>
                    </div>
                  )}
                  {trip.truck && (
                    <div className="flex items-center gap-3">
                      <Car className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="text-sm text-slate-400">Truck</p>
                        <p className="text-slate-100 font-medium">{trip.truck.registration_number}</p>
                      </div>
                    </div>
                  )}
                  
                </CardContent>
              </Card>
            </div>

            {trip.trip_loads && trip.trip_loads.length > 0 && (
              <Card className={GLASS_CARD}>
                <CardHeader className="border-b border-white/10">
                  <CardTitle className="text-lg text-slate-200">Pooled Farmers ({trip.trip_loads.length})</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    {trip.trip_loads.map((tl, index) => (
                      <div key={tl.load_request_id} className="flex items-start gap-4 p-3 rounded-lg bg-white/5">
                        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 font-bold text-sm">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-100 capitalize">{tl.load_request?.crop_type}</span>
                            <span className="text-xs text-slate-500">• {tl.load_request?.weight_kg}kg</span>
                          </div>
                          {tl.load_request?.origin_address && (
                            <p className="text-sm text-slate-400 flex items-center gap-1 mt-1">
                              <MapPin className="h-3 w-3" />{tl.load_request.origin_address}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="text-sm text-slate-500">
              <p>Created: {formatDate(trip.created_at)}</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}