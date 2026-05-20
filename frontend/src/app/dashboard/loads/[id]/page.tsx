"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuthStore } from "@/store/useAppStore";
import { useLoadRequest } from "@/hooks/useApi";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Package, MapPin, Calendar, Truck } from "lucide-react";

const DARK_THEME_BG = "bg-[linear-gradient(135deg,#0d2d1a_0%,#0f2a1d_25%,#1a1200_75%,#1a1200_100%)]";
const GLASS_CARD = "border border-white/10 bg-white/5 backdrop-blur-xl rounded-2xl";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  pooled: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  assigned: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  in_transit: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  delivered: "bg-green-500/20 text-green-400 border-green-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function LoadDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { isAuthenticated } = useAuthStore();
  const loadId = params.id as string;
  
  const { data: load, isLoading, error } = useLoadRequest(loadId);

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
          onClick={() => router.push("/dashboard/loads")}
          className="mb-6 text-slate-300 hover:text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />Back to Loads
        </Button>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-green-500" />
          </div>
        ) : error ? (
          <Card className={GLASS_CARD}>
            <CardContent className="py-12 text-center text-red-400">
              Failed to load request details
            </CardContent>
          </Card>
        ) : load ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white capitalize">{load.crop_type}</h1>
                {load.crop_variety && (
                  <p className="text-slate-400 text-sm">{load.crop_variety}</p>
                )}
                <span className={cn("px-3 py-1 rounded-full text-sm font-medium border inline-block mt-2", statusColors[load.status])}>
                  {load.status.replace("_", " ")}
                </span>
              </div>
              {load.status === "pending" && (
                <Button 
                  onClick={() => router.push(`/dashboard/loads/pool?load_id=${load.id}`)}
                  className="bg-gradient-to-r from-green-600 to-green-500 shadow-lg shadow-green-500/30"
                >
                  <Truck className="mr-2 h-4 w-4" />Find Pool
                </Button>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className={GLASS_CARD}>
                <CardHeader className="border-b border-white/10">
                  <CardTitle className="text-lg text-slate-200">Load Details</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-sm text-slate-400">Weight</p>
                      <p className="text-slate-100 font-medium">{load.weight_kg} kg</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-sm text-slate-400">Pickup Date</p>
                      <p className="text-slate-100 font-medium">{formatDate(load.pickup_date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Truck className="h-5 w-5 text-amber-500" />
                    <div>
                      <p className="text-sm text-slate-400">Load ID</p>
                      <p className="text-slate-100 font-mono text-xs">{load.id}</p>
                    </div>
                  </div>
                  {load.expected_price && (
                    <div className="pt-2 border-t border-white/10">
                      <p className="text-sm text-slate-400">Expected Price</p>
                      <p className="text-amber-400 text-xl font-semibold">{formatCurrency(load.expected_price)}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className={GLASS_CARD}>
                <CardHeader className="border-b border-white/10">
                  <CardTitle className="text-lg text-slate-200">Route</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div>
                    <p className="text-sm text-slate-400 mb-1 flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      Origin
                    </p>
                    <p className="text-slate-100">{load.origin_address || "Not specified"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400 mb-1 flex items-center gap-2">
                      <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                      Destination (Mandi)
                    </p>
                    <p className="text-slate-100">{load.destination_mandi}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="text-sm text-slate-500">
              <p>Created: {formatDate(load.created_at)}</p>
              <p>Updated: {formatDate(load.updated_at)}</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}