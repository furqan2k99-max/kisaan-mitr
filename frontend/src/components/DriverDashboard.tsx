"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAppStore";
import { setAuthToken, api } from "@/lib/api";
import { useTrips } from "@/hooks/useApi";
import { formatCurrency, formatDateTime, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, Package, MapPin, CheckCircle2, Navigation, Loader2, IndianRupee } from "lucide-react";

export function DriverDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { data: trips, isLoading, refetch } = useTrips();
  const [updatingTrip, setUpdatingTrip] = useState<string | null>(null);

  useEffect(() => { if (!isAuthenticated) router.push("/login"); }, [isAuthenticated, router]);

  const handleLogout = () => { logout(); setAuthToken(null); router.push("/login"); };

  const updateTripStatus = async (tripId: string, newStatus: string) => {
    setUpdatingTrip(tripId);
    try { await api.put(`/trips/${tripId}/status`, null, { params: { new_status: newStatus } }); refetch(); }
    catch (err) { console.error("Failed:", err); }
    finally { setUpdatingTrip(null); }
  };

  const active = trips?.filter((t) => t.status === "scheduled" || t.status === "in_progress") || [];
  const completed = trips?.filter((t) => t.status === "completed") || [];
  const earnings = completed.reduce((s, t) => s + (t.total_fare ? Number(t.total_fare) * 0.88 : 0), 0);

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white rounded-full p-2"><Truck className="h-8 w-8 text-blue-700" /></div>
            <div><h1 className="text-2xl font-bold">Kisaan Mitr</h1><p className="text-blue-200 text-sm">Driver Dashboard</p></div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right"><p className="font-medium">{user?.full_name}</p><p className="text-blue-200 text-sm">{user?.phone}</p></div>
            <Button variant="outline" className="bg-blue-800 text-white border-blue-600 hover:bg-blue-900" onClick={handleLogout}>Logout</Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Active Trips", value: active.length, icon: Truck, from: "from-blue-500", to: "to-blue-600", accent: "text-blue-200" },
            { label: "Completed", value: completed.length, icon: CheckCircle2, from: "from-green-500", to: "to-green-600", accent: "text-green-200" },
            { label: "Earnings", value: formatCurrency(earnings), icon: IndianRupee, from: "from-purple-500", to: "to-purple-600", accent: "text-purple-200" },
            { label: "Weight Moved", value: `${completed.reduce((s, t) => s + (t.total_weight_kg || 0), 0)}kg`, icon: Package, from: "from-orange-500", to: "to-orange-600", accent: "text-orange-200" },
          ].map((s) => (
            <Card key={s.label} className={`bg-gradient-to-br ${s.from} ${s.to} text-white`}>
              <CardContent className="p-5 flex items-center justify-between">
                <div><p className={`${s.accent} text-sm`}>{s.label}</p><p className="text-3xl font-bold">{s.value}</p></div>
                <s.icon className={`h-10 w-10 ${s.accent}`} />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="shadow-md">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
              <CardTitle className="flex items-center space-x-2"><Navigation className="h-5 w-5" /><span>Active Trips ({active.length})</span></CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
              : active.length === 0 ? <div className="text-center py-8 text-gray-500"><Truck className="h-12 w-12 mx-auto mb-3 text-gray-300" /><p>No active trips</p></div>
              : <div className="space-y-4">{active.map((trip) => (
                <div key={trip.id} className="border rounded-xl p-5 bg-white shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-lg flex items-center"><MapPin className="h-4 w-4 text-blue-600 mr-2" />{trip.mandi_destination}</span>
                    <span className={cn("px-3 py-1 rounded-full text-xs font-medium", trip.status === "scheduled" ? "bg-yellow-100 text-yellow-800" : "bg-blue-100 text-blue-800")}>
                      {trip.status === "scheduled" ? "⏰ Scheduled" : "🚛 In Progress"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-4 text-sm text-gray-600">
                    <span className="flex items-center"><Package className="h-3 w-3 mr-1" />{trip.total_weight_kg || 0}kg</span>
                    <span className="flex items-center"><Navigation className="h-3 w-3 mr-1" />{trip.total_distance_km ? `${Number(trip.total_distance_km).toFixed(1)}km` : "—"}</span>
                    <span className="flex items-center"><IndianRupee className="h-3 w-3 mr-1" />{trip.total_fare ? formatCurrency(Number(trip.total_fare)) : "—"}</span>
                  </div>
                  {trip.trip_loads?.length > 0 && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs font-medium text-gray-500 mb-2">PICKUP SEQUENCE ({trip.trip_loads.length} farmers)</p>
                      {trip.trip_loads.map((ld, i) => (
                        <div key={ld.load_request_id} className="flex items-center justify-between text-sm py-1">
                          <span className="flex items-center"><span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center mr-2 font-bold">{i+1}</span>{ld.allocated_weight_kg||0}kg</span>
                          <span className="text-green-600 font-medium">{ld.fare_share ? formatCurrency(Number(ld.fare_share)) : "—"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    {trip.status === "scheduled" && <Button className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={updatingTrip === trip.id} onClick={() => updateTripStatus(trip.id, "in_progress")}>{updatingTrip === trip.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Truck className="h-4 w-4 mr-2" />}Start Pickup</Button>}
                    {trip.status === "in_progress" && <Button className="flex-1 bg-green-600 hover:bg-green-700" disabled={updatingTrip === trip.id} onClick={() => updateTripStatus(trip.id, "completed")}>{updatingTrip === trip.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}Mark Delivered</Button>}
                  </div>
                </div>
              ))}</div>}
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-lg">
              <CardTitle className="flex items-center space-x-2"><CheckCircle2 className="h-5 w-5" /><span>Completed ({completed.length})</span></CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {completed.length === 0 ? <div className="text-center py-8 text-gray-500"><CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-gray-300" /><p>No completed trips</p></div>
              : <div className="space-y-3">{completed.slice(0,10).map((trip) => (
                <div key={trip.id} className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div><p className="font-medium">{trip.mandi_destination}</p><p className="text-sm text-gray-500">{trip.total_weight_kg}kg • {trip.trip_loads?.length||0} farmers</p></div>
                  <div className="text-right"><p className="font-bold text-green-700">{trip.total_fare ? formatCurrency(Number(trip.total_fare)*0.88) : "—"}</p></div>
                </div>
              ))}</div>}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
