"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAppStore";
import { useLoadRequests } from "@/hooks/useApi";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Truck, Package, MapPin, Calendar, Loader2, AlertCircle, Plus, Filter, Users } from "lucide-react";

const DARK_THEME_BG = "bg-[linear-gradient(135deg,#0d2d1a_0%,#0f2a1d_25%,#1a1200_75%,#1a1200_100%)]";
const GLASS_CARD = "border border-white/10 bg-white/5 backdrop-blur-xl rounded-2xl";
const GLASS_CARD_HOVER = "hover:bg-white/8 hover:border-green-500/30 hover:shadow-lg hover:shadow-green-500/10 hover:-translate-y-0.5";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  pooled: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  assigned: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  in_transit: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  delivered: "bg-green-500/20 text-green-400 border-green-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function LoadsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { data: loads, isLoading, error } = useLoadRequests();
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  const filteredLoads = loads?.filter((load) => {
    const matchesFilter = filter === "all" || load.status === filter;
    const matchesSearch = !search || 
      load.crop_type.toLowerCase().includes(search.toLowerCase()) ||
      load.destination_mandi.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  }) || [];

  const statusCounts = loads?.reduce((acc, load) => {
    acc[load.status] = (acc[load.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <div className={cn("min-h-screen pb-24", DARK_THEME_BG)}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">My Load Requests</h1>
          <p className="text-slate-400">Manage your transport requests</p>
        </div>
        <Button onClick={() => router.push("/dashboard/loads/new")} className="bg-gradient-to-r from-green-600 to-green-500 shadow-lg shadow-green-500/30">
          <Plus className="mr-2 h-4 w-4" />New Request
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        <button
          onClick={() => setFilter("all")}
          className={cn("p-3 rounded-lg text-center border-2 transition-all", filter === "all" ? "border-green-500 bg-green-500/20" : "border-white/10 hover:border-green-500/30")}
        >
          <p className="text-2xl font-bold text-slate-100">{loads?.length || 0}</p>
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

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search by crop or destination..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Load List */}
      <Card className={GLASS_CARD}>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-green-500" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-red-400">
              <AlertCircle className="h-8 w-8 mb-2" />
              <p>Failed to load requests</p>
            </div>
          ) : filteredLoads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Package className="h-16 w-16 mb-4 text-slate-600" />
              <p className="text-lg font-medium text-slate-300">No loads found</p>
              <p className="text-sm">{search || filter !== "all" ? "Try adjusting your filters" : "Create your first transport request"}</p>
              {!search && filter === "all" && (
                <Button onClick={() => router.push("/dashboard/loads/new")} className="mt-4 bg-gradient-to-r from-green-600 to-green-500 shadow-lg shadow-green-500/30">
                  <Plus className="mr-2 h-4 w-4" />Create Request
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {filteredLoads.map((load) => (
                <div key={load.id} className="p-4 hover:bg-white/5 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={cn("p-3 rounded-lg", statusColors[load.status].replace("text-", "bg-").replace("border-", "bg-").split(" ")[0] + "/20")}>
                        <Package className={cn("h-5 w-5", statusColors[load.status].split(" ")[1])} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold capitalize text-slate-100">{load.crop_type}</h3>
                          <span className={cn("px-2 py-0.5 rounded text-xs font-medium border", statusColors[load.status])}>
                            {load.status.replace("_", " ")}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                          <span className="flex items-center gap-1"><Package className="h-3 w-3" />{load.weight_kg}kg</span>
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{load.destination_mandi}</span>
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(load.pickup_date)}</span>
                        </div>
                        {load.origin_address && <p className="text-xs text-slate-500 mt-1">📍 {load.origin_address}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {load.status === "pending" && (
                        <Button 
                          size="sm" 
                          onClick={() => router.push(`/dashboard/loads/pool?load_id=${load.id}`)}
                          className="bg-gradient-to-r from-green-600 to-green-500 shadow-lg shadow-green-500/30 hover:shadow-green-400/40"
                        >
                          <Users className="mr-1 h-3 w-3" />View Pool
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/loads/${load.id}`)} className="border-white/20 text-slate-300 hover:bg-white/10">
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