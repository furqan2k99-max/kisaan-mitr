"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAppStore";
import { setAuthToken, api } from "@/lib/api";
import { formatCurrency, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, Package, Users, MapPin, BarChart3, Loader2, IndianRupee, Wheat, TrendingUp, Activity } from "lucide-react";

interface Analytics {
  users: { total_farmers: number; total_drivers: number };
  fleet: { total_trucks: number; available_trucks: number };
  loads: { total: number; pending: number; delivered: number };
  trips: { total: number; active: number; completed: number; avg_farmers_per_trip: number };
  financials: { total_revenue: number };
  logistics: { total_weight_moved_kg: number };
}

interface MandiItem { id: string; name: string; state: string; district: string; address?: string }

export function AdminDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [mandis, setMandis] = useState<MandiItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!isAuthenticated) router.push("/login"); }, [isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const load = async () => {
      try {
        const [aRes, mRes] = await Promise.all([
          api.get("/admin/analytics"),
          api.get("/admin/mandis"),
        ]);
        setAnalytics(aRes.data);
        setMandis(mRes.data);
      } catch (err) { console.error("Admin fetch error:", err); }
      finally { setLoading(false); }
    };
    load();
  }, [isAuthenticated]);

  const handleLogout = () => { logout(); setAuthToken(null); router.push("/login"); };

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-green-500 rounded-full p-2"><Wheat className="h-8 w-8 text-white" /></div>
            <div><h1 className="text-2xl font-bold">Kisaan Mitr</h1><p className="text-gray-400 text-sm">Admin Control Panel</p></div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right"><p className="font-medium">{user?.full_name}</p><p className="text-gray-400 text-sm">Administrator</p></div>
            <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700" onClick={handleLogout}>Logout</Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-12 w-12 animate-spin text-green-500" /></div>
        ) : analytics ? (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
              {[
                { label: "Farmers", value: analytics.users.total_farmers, icon: Users, color: "from-green-500 to-emerald-600" },
                { label: "Drivers", value: analytics.users.total_drivers, icon: Truck, color: "from-blue-500 to-blue-600" },
                { label: "Trucks", value: `${analytics.fleet.available_trucks}/${analytics.fleet.total_trucks}`, icon: Truck, color: "from-purple-500 to-purple-600" },
                { label: "Total Loads", value: analytics.loads.total, icon: Package, color: "from-orange-500 to-orange-600" },
                { label: "Revenue", value: formatCurrency(analytics.financials.total_revenue), icon: IndianRupee, color: "from-yellow-500 to-amber-600" },
                { label: "Weight Moved", value: `${(analytics.logistics.total_weight_moved_kg / 1000).toFixed(1)}t`, icon: TrendingUp, color: "from-teal-500 to-teal-600" },
              ].map((kpi) => (
                <Card key={kpi.label} className={`bg-gradient-to-br ${kpi.color} text-white border-0`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <kpi.icon className="h-5 w-5 opacity-75" />
                    </div>
                    <p className="text-2xl font-bold">{kpi.value}</p>
                    <p className="text-xs opacity-80">{kpi.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Load Pipeline */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader><CardTitle className="text-lg flex items-center"><Package className="h-5 w-5 mr-2 text-orange-400" />Load Pipeline</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { label: "Pending", value: analytics.loads.pending, total: analytics.loads.total, color: "bg-yellow-500" },
                      { label: "Delivered", value: analytics.loads.delivered, total: analytics.loads.total, color: "bg-green-500" },
                      { label: "Active", value: analytics.loads.total - analytics.loads.pending - analytics.loads.delivered, total: analytics.loads.total, color: "bg-blue-500" },
                    ].map((item) => (
                      <div key={item.label}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-400">{item.label}</span>
                          <span className="font-medium">{item.value}</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div className={`${item.color} h-2 rounded-full transition-all`} style={{ width: `${item.total > 0 ? (item.value / item.total) * 100 : 0}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Trip Performance */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader><CardTitle className="text-lg flex items-center"><Activity className="h-5 w-5 mr-2 text-blue-400" />Trip Performance</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-gray-750 rounded-lg bg-gray-700/50">
                      <span className="text-gray-400">Total Trips</span>
                      <span className="text-2xl font-bold">{analytics.trips.total}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                      <span className="text-gray-400">Active Now</span>
                      <span className="text-2xl font-bold text-blue-400">{analytics.trips.active}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                      <span className="text-gray-400">Completed</span>
                      <span className="text-2xl font-bold text-green-400">{analytics.trips.completed}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                      <span className="text-gray-400">Avg Farmers/Trip</span>
                      <span className="text-2xl font-bold text-purple-400">{analytics.trips.avg_farmers_per_trip}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Fleet */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader><CardTitle className="text-lg flex items-center"><Truck className="h-5 w-5 mr-2 text-purple-400" />Fleet Status</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-center mb-4">
                    <div className="relative inline-flex items-center justify-center w-32 h-32">
                      <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="50" fill="none" stroke="#374151" strokeWidth="10" />
                        <circle cx="60" cy="60" r="50" fill="none" stroke="#8B5CF6" strokeWidth="10" strokeDasharray={`${analytics.fleet.total_trucks > 0 ? (analytics.fleet.available_trucks / analytics.fleet.total_trucks) * 314 : 0} 314`} strokeLinecap="round" />
                      </svg>
                      <div className="absolute text-center">
                        <p className="text-2xl font-bold">{analytics.fleet.available_trucks}</p>
                        <p className="text-xs text-gray-400">Available</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-around text-center">
                    <div><p className="text-xl font-bold">{analytics.fleet.total_trucks}</p><p className="text-xs text-gray-400">Total</p></div>
                    <div><p className="text-xl font-bold text-green-400">{analytics.fleet.available_trucks}</p><p className="text-xs text-gray-400">Free</p></div>
                    <div><p className="text-xl font-bold text-red-400">{analytics.fleet.total_trucks - analytics.fleet.available_trucks}</p><p className="text-xs text-gray-400">In Use</p></div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Mandis Table */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader><CardTitle className="text-lg flex items-center"><MapPin className="h-5 w-5 mr-2 text-green-400" />Registered APMC Mandis ({mandis.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-gray-700 text-gray-400">
                      <th className="text-left py-3 px-4">Mandi</th><th className="text-left py-3 px-4">District</th><th className="text-left py-3 px-4">State</th><th className="text-left py-3 px-4">Address</th>
                    </tr></thead>
                    <tbody>{mandis.map((m) => (
                      <tr key={m.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                        <td className="py-3 px-4 font-medium">{m.name}</td><td className="py-3 px-4 text-gray-400">{m.district}</td>
                        <td className="py-3 px-4 text-gray-400">{m.state}</td><td className="py-3 px-4 text-gray-400 text-xs">{m.address || "—"}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="text-center py-20 text-gray-500"><p>Failed to load analytics</p></div>
        )}
      </main>
    </div>
  );
}
