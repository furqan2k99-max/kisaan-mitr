"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAppStore";
import { setAuthToken, poolingApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Truck,
  Users,
  MapPin,
  Clock,
  IndianRupee,
  CheckCircle2,
  ArrowRight,
  Wheat,
  Leaf,
  Scan,
  Sparkles,
  Scale,
  Route,
  Loader2,
} from "lucide-react";

const DARK_EARTHY_BG = "bg-[linear-gradient(135deg,#0d2d1a_0%,#0f2a1d_25%,#1a1200_75%,#1a1200_100%)]";

interface Farmer {
  id: string;
  name: string;
  crop: string;
  cropEmoji: string;
  weightKg: number;
  distanceKm: number;
}

interface PoolData {
  truckCapacity: number;
  baseFare: number;
  platformCommission: number;
  destination: string;
  etaMinutes: number;
  currentUserId: string;
  farmers: Farmer[];
}

interface FarmerCost {
  farmer: Farmer;
  cost: number;
  saving: number;
  isCurrentUser: boolean;
}

type PoolState = "scanning" | "matching" | "result";

interface PoolingScreenProps {
  poolData: PoolData;
  onConfirm?: () => void;
  isConfirming?: boolean;
  error?: string | null;
}

function PoolingScreen({ poolData, onConfirm, isConfirming, error }: PoolingScreenProps) {
  const [poolState, setPoolState] = useState<PoolState>("scanning");
  const [scannedCount, setScannedCount] = useState(0);
  const [farmerCosts, setFarmerCosts] = useState<FarmerCost[]>([]);
  const [totalWeight, setTotalWeight] = useState(0);

  const { truckCapacity, baseFare, platformCommission, destination, etaMinutes, currentUserId, farmers } = poolData;

  useEffect(() => {
    if (poolState === "scanning") {
      const interval = setInterval(() => {
        setScannedCount((prev) => {
          if (prev >= farmers.length) {
            clearInterval(interval);
            setPoolState("matching");
            return farmers.length;
          }
          return prev + 1;
        });
      }, 400);
      return () => clearInterval(interval);
    }

    if (poolState === "matching") {
      const timeout = setTimeout(() => {
        calculateCosts();
        setPoolState("result");
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [poolState]);

  const calculateCosts = () => {
    const totalPoolCost = baseFare * (1 + platformCommission);
    let runningWeight = 0;

    const costs: FarmerCost[] = farmers.map((farmer) => {
      runningWeight += farmer.weightKg;
      const weightRatio = runningWeight / truckCapacity;
      const cost = weightRatio * totalPoolCost;
      const directCost = baseFare * (1 + platformCommission);
      const saving = directCost - cost;

      return {
        farmer,
        cost: Math.round(cost),
        saving: Math.round(saving),
        isCurrentUser: farmer.id === currentUserId,
      };
    });

    setFarmerCosts(costs);
    setTotalWeight(farmers.reduce((sum, f) => sum + f.weightKg, 0));
  };

  const totalPoolCost = baseFare * (1 + platformCommission);
  const currentUserCost = farmerCosts.find((f) => f.isCurrentUser)?.cost || 0;
  const currentUserSaving = farmerCosts.find((f) => f.isCurrentUser)?.saving || 0;
  const capacityPct = (totalWeight / truckCapacity) * 100;

  return (
    <div className={`min-h-screen pb-28 ${DARK_EARTHY_BG}`}>
      <style jsx>{`
        @keyframes scan-line {
          0%, 100% { top: 0; }
          50% { top: 100%; }
        }
        @keyframes pulse-ring {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.1); opacity: 0.2; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
      `}</style>

      {/* Background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-green-500/8 to-transparent blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-amber-500/5 to-transparent blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/5">
        <div
          className="px-4 py-4"
          style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="max-w-md mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #1e3a2f 0%, #152a23 100%)", boxShadow: "0 4px 15px rgba(0,0,0,0.3)" }}
              >
                <Wheat className="h-6 w-6 text-green-400" style={{ filter: "drop-shadow(0 0 5px rgba(34, 197, 94, 0.3))" }} />
              </div>
              <div>
                <h1 className="font-bold text-white text-lg">AgriPool AI</h1>
                <p className="text-xs text-green-400 font-medium">Knapsack Optimizer</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-6 relative">
        {/* Truck Info Banner */}
        <div
          className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5"
          style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #16a34a 0%, #22c55e 100%)", boxShadow: "0 4px 15px rgba(34, 197, 94, 0.3)" }}
              >
                <Truck className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold">Tata Ace XL</p>
                <p className="text-sm text-slate-400">{truckCapacity}kg capacity</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-amber-400 font-bold text-xl">₹{baseFare.toLocaleString()}</p>
              <p className="text-xs text-slate-400">Base fare</p>
            </div>
          </div>

          {/* Capacity Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Capacity fill</span>
              <span className="text-green-400 font-medium">{capacityPct.toFixed(0)}%</span>
            </div>
            <Progress value={capacityPct} className="h-2 bg-white/10" />
            <p className="text-xs text-slate-500">{totalWeight}kg / {truckCapacity}kg loaded</p>
          </div>
        </div>

        {/* Destination & ETA */}
        <div className="grid grid-cols-2 gap-3">
          <div
            className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-4"
            style={{ boxShadow: "0 4px 15px rgba(0,0,0,0.2)" }}
          >
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <MapPin className="h-4 w-4" />
              <span className="text-xs">Destination</span>
            </div>
            <p className="text-white font-medium text-sm">{destination}</p>
          </div>
          <div
            className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-4"
            style={{ boxShadow: "0 4px 15px rgba(0,0,0,0.2)" }}
          >
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs">ETA</span>
            </div>
            <p className="text-white font-medium text-sm">{etaMinutes} min</p>
          </div>
        </div>

        {/* Main Pooling Visualization */}
        <div
          className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden"
          style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}
        >
          {/* Scanning State */}
          {poolState === "scanning" && (
            <div className="p-8 text-center">
              <div className="relative w-32 h-32 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full border-2 border-green-500/30 animate-pulse" />
                <div className="absolute inset-4 rounded-full border border-green-500/20 animate-pulse delay-75" />
                <div
                  className="absolute inset-0 rounded-full flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, rgba(34,197,94,0.2) 0%, rgba(34,197,94,0.05) 100%)" }}
                >
                  <Scan className="h-12 w-12 text-green-400 animate-pulse" style={{ filter: "drop-shadow(0 0 10px rgba(34, 197, 94, 0.5))" }} />
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Scanning Nearby Farmers</h3>
              <p className="text-slate-400 mb-4">Finding optimal pool candidates...</p>
              <div className="flex justify-center gap-2">
                {farmers.map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-3 h-3 rounded-full transition-all duration-300",
                      i < scannedCount ? "bg-green-400" : "bg-white/20"
                    )}
                    style={i < scannedCount ? { boxShadow: "0 0 10px rgba(34, 197, 94, 0.5)" } : {}}
                  />
                ))}
              </div>
              <p className="text-sm text-slate-500 mt-4">{scannedCount} / {farmers.length} farmers scanned</p>
            </div>
          )}

          {/* Matching State */}
          {poolState === "matching" && (
            <div className="p-8 text-center">
              <div className="relative w-32 h-32 mx-auto mb-6">
                <Loader2 className="h-16 w-16 text-green-400 animate-spin" style={{ filter: "drop-shadow(0 0 10px rgba(34, 197, 94, 0.5))" }} />
                <div className="absolute inset-0 bg-green-400/20 rounded-full animate-ping" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Running Knapsack Algorithm</h3>
              <p className="text-slate-400 mb-4">Optimizing load distribution...</p>
              <div className="flex items-center justify-center gap-2 text-amber-400">
                <Scale className="h-5 w-5" />
                <span className="text-sm font-medium">Calculating optimal weights</span>
              </div>
            </div>
          )}

          {/* Result State */}
          {poolState === "result" && (
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-500/20 rounded-full" style={{ boxShadow: "0 0 20px rgba(34, 197, 94, 0.3)" }}>
                  <CheckCircle2 className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Pool Optimized!</h3>
                  <p className="text-sm text-slate-400">{farmers.length} farmers • {totalWeight}kg total</p>
                </div>
              </div>

              {/* Farmer Cards */}
              <div className="space-y-3">
                {farmerCosts.map((fc, i) => (
                  <div
                    key={fc.farmer.id}
                    className={cn(
                      "relative rounded-xl p-4 border transition-all duration-300",
                      fc.isCurrentUser
                        ? "border-green-500/50 bg-green-500/5"
                        : "border-white/10 bg-white/5"
                    )}
                    style={fc.isCurrentUser ? { boxShadow: "0 0 20px rgba(34, 197, 94, 0.2)" } : {}}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                            style={{ background: "rgba(255,255,255,0.1)" }}
                          >
                            {fc.farmer.cropEmoji}
                          </div>
                          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                            <span className="text-[10px]">{i + 1}</span>
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-white">{fc.farmer.name}</p>
                            {fc.isCurrentUser && (
                              <span className="px-1.5 py-0.5 text-[10px] bg-green-500/20 text-green-400 rounded border border-green-500/30">You</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400">{fc.farmer.crop} • {fc.farmer.weightKg}kg • {fc.farmer.distanceKm}km</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-amber-400">₹{fc.cost.toLocaleString()}</p>
                        <p className="text-xs text-green-400">Save ₹{fc.saving.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary Card */}
              <div
                className="rounded-xl p-4 border border-amber-500/20 bg-amber-500/5"
                style={{ boxShadow: "0 0 20px rgba(245, 158, 11, 0.1)" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <IndianRupee className="h-5 w-5 text-amber-400" />
                    <span className="text-white font-semibold">Pool Total</span>
                  </div>
                  <span className="text-xl font-bold text-amber-400">₹{totalPoolCost.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Base fare</span>
                  <span className="text-slate-300">₹{baseFare.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Platform ({platformCommission * 100}%)</span>
                  <span className="text-slate-300">₹{Math.round(totalPoolCost - baseFare).toLocaleString()}</span>
                </div>
                <div className="border-t border-white/10 mt-3 pt-3 flex items-center justify-between">
                  <span className="text-green-400 font-medium">Your savings</span>
                  <span className="text-xl font-bold text-green-400">₹{currentUserSaving.toLocaleString()}</span>
                </div>
              </div>

              {/* Confirm Button */}
              <Button
                onClick={onConfirm}
                disabled={isConfirming}
                className="w-full py-5 text-lg font-bold rounded-xl text-white border-0 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: "linear-gradient(135deg, #16a34a 0%, #22c55e 50%, #16a34a 100%)",
                  boxShadow: "0 4px 20px rgba(34, 197, 94, 0.4)",
                }}
              >
                {isConfirming ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Confirming...
                  </>
                ) : (
                  <>
                    Confirm Pool - ₹{currentUserCost.toLocaleString()}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
              {error && <p className="text-red-400 text-sm text-center mt-2">{error}</p>}
            </div>
          )}
        </div>

        {/* Algorithm Info */}
        {poolState === "result" && (
          <div
            className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-4"
            style={{ boxShadow: "0 4px 15px rgba(0,0,0,0.2)" }}
          >
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <Sparkles className="h-4 w-4 text-green-400" />
              <span className="text-sm font-medium">How it works</span>
            </div>
            <p className="text-xs text-slate-500">
              Knapsack algorithm optimally distributes truck capacity across {farmers.length} farmers to minimize total cost while maximizing load efficiency.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

// Default mock data for demo
const DEFAULT_POOL_DATA: PoolData = {
  truckCapacity: 800,
  baseFare: 2500,
  platformCommission: 0.12,
  destination: "Mysore (Bandipalya APMC)",
  etaMinutes: 22,
  currentUserId: "farmer_1",
  farmers: [
    { id: "farmer_1", name: "Furqan", crop: "Wheat", cropEmoji: "🌾", weightKg: 200, distanceKm: 2.3 },
    { id: "farmer_2", name: "Ravi Kumar", crop: "Tomato", cropEmoji: "🍅", weightKg: 200, distanceKm: 1.8 },
    { id: "farmer_3", name: "Suresh Patil", crop: "Potato", cropEmoji: "🥔", weightKg: 250, distanceKm: 3.1 },
    { id: "farmer_4", name: "Meena Devi", crop: "Onion", cropEmoji: "🧅", weightKg: 150, distanceKm: 4.2 },
  ],
};

// Main Page Component
export default function PoolPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [poolData, setPoolData] = useState<PoolData | null>(null);
  const [loadId, setLoadId] = useState<string>("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirmPool = async () => {
    if (!loadId) return;
    try {
      setIsConfirming(true);
      setError(null);
      await poolingApi.confirm(loadId);
      router.push("/dashboard/trips?success=pool_confirmed");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to confirm pool");
    } finally {
      setIsConfirming(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    // Get load ID from URL query params or use a default for demo
    const params = new URLSearchParams(window.location.search);
    const loadFromUrl = params.get("load_id");
    
    if (loadFromUrl) {
      setLoadId(loadFromUrl);
      fetchPoolData(loadFromUrl);
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchPoolData = async (id: string) => {
    try {
      setIsLoading(true);
      const data = await poolingApi.analyze(id);
      
      // Transform API response to PoolData format
      const transformed: PoolData = {
        truckCapacity: data.truck_capacity,
        baseFare: data.base_fare,
        platformCommission: data.platform_commission,
        destination: data.destination,
        etaMinutes: data.eta_minutes,
        currentUserId: data.current_user_id,
        farmers: data.farmers.map(f => ({
          id: f.id,
          name: f.name,
          crop: f.crop,
          cropEmoji: f.crop_emoji,
          weightKg: f.weight_kg,
          distanceKm: f.distance_km,
        })),
      };
      setPoolData(transformed);
    } catch (err) {
      console.error("Failed to fetch pool data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) return null;

  if (isLoading) {
    return (
      <div className={`min-h-screen pb-28 ${DARK_EARTHY_BG}`}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-green-400 animate-spin mx-auto mb-4" style={{ filter: "drop-shadow(0 0 10px rgba(34, 197, 94, 0.5))" }} />
            <p className="text-slate-400">Analyzing pool options...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!poolData) {
    return (
      <div className={`min-h-screen pb-28 ${DARK_EARTHY_BG}`}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center p-8">
            <p className="text-slate-400 mb-4">No load selected for pool analysis</p>
            <Button onClick={() => router.push("/dashboard/loads/new")} className="bg-green-600">
              Create New Load
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <PoolingScreen poolData={poolData} onConfirm={handleConfirmPool} isConfirming={isConfirming} error={error} />;
}