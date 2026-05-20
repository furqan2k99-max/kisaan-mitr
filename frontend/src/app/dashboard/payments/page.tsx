"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAppStore";
import { useLoadRequests } from "@/hooks/useApi";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IndianRupee, Package, Truck, Clock, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

const DARK_THEME_BG = "bg-[linear-gradient(135deg,#0d2d1a_0%,#0f2a1d_25%,#1a1200_75%,#1a1200_100%)]";
const GLASS_CARD = "border border-white/10 bg-white/5 backdrop-blur-xl rounded-2xl";

const paymentStatusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400",
  escrow_held: "bg-blue-500/20 text-blue-400",
  released: "bg-green-500/20 text-green-400",
  refunded: "bg-red-500/20 text-red-400",
};

export default function PaymentsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { data: loads, isLoading } = useLoadRequests();
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  const loadsWithPayments = loads?.filter((l) => l.expected_price) || [];
  
  const filteredLoads = loadsWithPayments.filter((load) => {
    if (filter === "all") return true;
    if (filter === "paid") return load.status === "delivered" || load.status === "pooled";
    if (filter === "pending") return load.status === "pending";
    return true;
  });

  const totalPaid = loadsWithPayments
    .filter((l) => l.status === "delivered")
    .reduce((acc, l) => acc + (l.expected_price || 0), 0);
  
  const totalPending = loadsWithPayments
    .filter((l) => l.status === "pending")
    .reduce((acc, l) => acc + (l.expected_price || 0), 0);

  return (
    <div className={cn("min-h-screen pb-24", DARK_THEME_BG)}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Payments</h1>
        <p className="text-slate-400">Track your payment history</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={cn("border-l-4 border-green-500", GLASS_CARD)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Paid</p>
                <p className="text-2xl font-bold text-green-400">{formatCurrency(totalPaid)}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className={cn("border-l-4 border-yellow-500", GLASS_CARD)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Pending Payment</p>
                <p className="text-2xl font-bold text-yellow-400">{formatCurrency(totalPending)}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card className={cn("border-l-4 border-blue-500", GLASS_CARD)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Transactions</p>
                <p className="text-2xl font-bold text-blue-400">{loadsWithPayments.length}</p>
              </div>
              <IndianRupee className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {["all", "paid", "pending"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-all", 
              filter === f ? "bg-gradient-to-r from-green-600 to-green-500 shadow-lg shadow-green-500/30 text-white" : "bg-white/10 text-slate-300 hover:bg-white/20")}
          >
            {f === "all" ? "All" : f === "paid" ? "Paid" : "Pending"}
          </button>
        ))}
      </div>

      {/* Payment List */}
      <Card className={GLASS_CARD}>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-green-500" />
            </div>
          ) : filteredLoads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <IndianRupee className="h-16 w-16 mb-4 text-slate-600" />
              <p className="text-lg font-medium text-slate-300">No payments found</p>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {filteredLoads.map((load) => (
                <div key={load.id} className="p-4 hover:bg-white/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-green-500/20">
                        <Package className="h-5 w-5 text-green-400" />
                      </div>
                      <div>
                        <p className="font-medium capitalize text-slate-100">{load.crop_type}</p>
                        <p className="text-sm text-slate-400">{load.weight_kg}kg • {load.destination_mandi}</p>
                        <p className="text-xs text-slate-500">{formatDate(load.pickup_date)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-amber-400">{formatCurrency(load.expected_price)}</p>
                      <span className={cn("px-2 py-0.5 rounded text-xs font-medium", 
                        load.status === "delivered" ? "bg-green-500/20 text-green-400" :
                        load.status === "pooled" ? "bg-blue-500/20 text-blue-400" :
                        "bg-yellow-500/20 text-yellow-400")}>
                        {load.status === "delivered" ? "Paid" : load.status === "pooled" ? "Escrow" : "Pending"}
                      </span>
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