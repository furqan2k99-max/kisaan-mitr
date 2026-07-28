"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { VoiceInput } from "@/components/VoiceInput";
import {
  Home,
  Truck,
  TrendingUp,
  User,
  Package,
  Wheat,
  Leaf,
  ArrowRight,
  TrendingDown,
  Target,
  PlusCircle,
  FolderOpen,
  Users,
  BarChart3,
  Clock,
  Cloud,
  Droplets,
  Wind,
} from "lucide-react";

interface WeatherData {
  temp: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  location: string;
}

const DARK_EARTHY_BG = "bg-[#0f2318]";

const NAV_ITEMS = [
  { icon: Home, label: "Home" },
  { icon: Truck, label: "Trips" },
  { icon: TrendingUp, label: "Prices" },
  { icon: User, label: "Profile" },
];

const NAV_ROUTES: Record<string, string> = {
  Home: "/dashboard/farmer",
  Trips: "/dashboard/trips",
  Prices: "/dashboard/mandi-prices",
  Profile: "/dashboard/profile",
};

function GlassNav({ active }: { active: string }) {
  const router = useRouter();
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-pb">
      <div 
        className="flex items-center justify-around h-18 px-4 mx-4 mb-2 rounded-2xl border border-white/10 bg-black/30 backdrop-blur-xl"
        style={{ boxShadow: "0 -4px 30px rgba(0,0,0,0.3)" }}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.label;
          return (
            <button
              key={item.label}
              onClick={() => router.push(NAV_ROUTES[item.label])}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-5 py-2 rounded-xl transition-all duration-300",
                isActive
                  ? "bg-green-500/20 text-green-400 shadow-lg shadow-green-500/20"
                  : "text-gray-400 hover:bg-white/5 hover:text-slate-300"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "drop-shadow-lg")} style={isActive ? { filter: "drop-shadow(0 0 8px rgba(34, 197, 94, 0.6))" } : {}} />
              <span className={cn("text-xs font-medium", isActive ? "text-green-400" : "text-gray-400")}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

interface LoadRequest {
  id: string;
  crop_type: string;
  quantity_kg: number;
  pickup_location: string;
  destination: string;
  status: string;
  created_at: string;
  estimated_price?: number;
  pooled?: boolean;
}

export default function FarmerDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [loads, setLoads] = useState<LoadRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLoads, setActiveLoads] = useState(0);
  const [totalSaved, setTotalSaved] = useState(0);
  const [poolEfficiency, setPoolEfficiency] = useState(0);
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    const fetchLoads = async () => {
      try {
        const response = await api.get<LoadRequest[]>("/load-requests", {});
        const loadsData = response.data || [];
        setLoads(loadsData);
        
        const active = loadsData.filter((l: LoadRequest) => 
          ["pending", "pooled", "assigned", "in_transit"].includes(l.status)
        ).length;
        setActiveLoads(active);
        
        const saved = loadsData.reduce((acc: number, l: LoadRequest) => {
          if (l.pooled && l.estimated_price) {
            return acc + (l.estimated_price * 0.12);
          }
          return acc;
        }, 0);
        setTotalSaved(Math.round(saved));
        
        const pooled = loadsData.filter((l: LoadRequest) => l.pooled).length;
        setPoolEfficiency(loadsData.length > 0 ? Math.round((pooled / loadsData.length) * 100) : 0);
      } catch (error) {
        console.error("Failed to fetch loads:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchWeather = async () => {
      // Mock weather data - in production, use a weather API
      setWeather({
        temp: 28,
        condition: "Partly Cloudy",
        humidity: 65,
        windSpeed: 12,
        location: "Mysuru, Karnataka"
      });
    };
    
    if (isAuthenticated) {
      fetchLoads();
      fetchWeather();
    }
  }, [isAuthenticated]);

  const handleVoiceResult = (transcript: string) => {
    setVoiceTranscript(transcript);
  };

  if (!isAuthenticated) return null;

  const initials = user?.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "U";
  const recentLoads = loads.slice(-3).reverse();

  return (
    <div className={`min-h-screen pb-28 ${DARK_EARTHY_BG}`}>
      <style jsx>{`
        @keyframes grain-texture {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-5%, -5%); }
        }
      `}</style>

      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-green-500/8 to-transparent blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-amber-500/5 to-transparent blur-3xl" />
        <div className="absolute top-1/2 left-1/4 w-[300px] h-[300px] rounded-full bg-gradient-to-r from-green-400/5 to-transparent blur-3xl" />
      </div>

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
                <h1 className="font-bold text-white text-lg">Kisaan Mitr</h1>
                <p className="text-xs text-green-400 font-medium flex items-center gap-1" style={{ textShadow: "0 0 10px rgba(34, 197, 94, 0.3)" }}>
                  <Leaf className="h-3 w-3" />
                  AgriPool AI
                </p>
              </div>
            </div>
            
            <button
              onClick={() => router.push("/dashboard/profile")}
              className="w-11 h-11 rounded-xl flex items-center justify-center transition-all hover:scale-105 border border-white/10"
              style={{ background: "linear-gradient(135deg, #16a34a 0%, #22c55e 100%)", boxShadow: "0 4px 15px rgba(34, 197, 94, 0.3)" }}
            >
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-white/20 text-white text-sm font-bold">{initials}</AvatarFallback>
              </Avatar>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-5 relative">
        {/* 1. HERO CARD */}
        <div 
          className="relative overflow-hidden rounded-2xl p-5"
          style={{ 
            background: "linear-gradient(135deg, #166534 0%, #15803d 50%, #14532d 100%)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -left-2 bottom-0 w-12 h-12 bg-amber-400/20 rounded-full blur-xl" />
          
          <div className="relative z-10">
            <h2 className="text-xl font-bold text-white">
              Welcome back, {user?.full_name?.split(" ")[0]} 👋
            </h2>
            <p className="text-green-200 text-sm mt-1">Apni fasal, apni marzi — transport smart karo</p>
            
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 border border-white/10">
                <Package className="h-4 w-4 text-green-300" />
                <span className="text-white text-sm font-medium">{activeLoads} active</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30">
                <TrendingDown className="h-4 w-4 text-amber-400" />
                <span className="text-amber-400 text-sm font-bold">₹{totalSaved.toLocaleString()} saved</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 border border-white/10">
                <Target className="h-4 w-4 text-green-300" />
                <span className="text-white text-sm font-medium">{poolEfficiency}% pool eff.</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. MOTTO CARD */}
        <div 
          className="relative overflow-hidden rounded-2xl p-4 flex items-center gap-3"
          style={{ 
            background: "#1f2937",
            borderLeft: "3px solid #22c55e",
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          }}
        >
          <div className="text-2xl">🌾</div>
          <div>
            <p className="text-white font-medium">ರೈತನ ಶ್ರಮ, AgriPool ನ ಶಕ್ತಿ — ಪ್ರತಿ ಬೆಳೆಗೂ ಸರಿಯಾದ ಬೆಲೆ ಸಿಗಲಿ</p>
            <p className="text-gray-400 text-xs mt-1">Farmer&apos;s hardwork, AgriPool&apos;s strength — may every crop get its rightful price</p>
          </div>
        </div>

        {/* 3. QUICK ACTIONS (2x2 grid) */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => router.push("/dashboard/loads/new")}
            className="flex flex-col gap-2 p-4 rounded-2xl border border-[#1e4029] bg-[#162d1e] hover:bg-[#1a3524] hover:border-[#22c55e] transition-all duration-300"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-500/20">
              <PlusCircle className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-white font-medium text-sm">New Request 🌾</p>
              <p className="text-gray-400 text-xs">Create new load</p>
            </div>
          </button>
          
          <button
            onClick={() => router.push("/dashboard/loads")}
            className="flex flex-col gap-2 p-4 rounded-2xl border border-[#1e4029] bg-[#162d1e] hover:bg-[#1a3524] hover:border-[#22c55e] transition-all duration-300"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/20">
              <FolderOpen className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-white font-medium text-sm">My Loads 📦</p>
              <p className="text-gray-400 text-xs">View all requests</p>
            </div>
          </button>
          
          <button
            onClick={() => router.push("/dashboard/loads")}
            className="flex flex-col gap-2 p-4 rounded-2xl border border-[#1e4029] bg-[#162d1e] hover:bg-[#1a3524] hover:border-[#22c55e] transition-all duration-300"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/20">
              <Users className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-white font-medium text-sm">View Pool 🚛</p>
              <p className="text-gray-400 text-xs">Join nearby loads</p>
            </div>
          </button>
          
          <button
            onClick={() => router.push("/dashboard/mandi-prices")}
            className="flex flex-col gap-2 p-4 rounded-2xl border border-[#1e4029] bg-[#162d1e] hover:bg-[#1a3524] hover:border-[#22c55e] transition-all duration-300"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-500/20">
              <BarChart3 className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-white font-medium text-sm">Mandi Prices 📊</p>
              <p className="text-gray-400 text-xs">Live market rates</p>
            </div>
          </button>
        </div>

        {/* 4. STATS ROW */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl border border-[#1e4029] bg-[#162d1e]">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-500/20 mb-2">
              <Package className="h-4 w-4 text-green-400" />
            </div>
            <p className="text-2xl font-bold text-white">{loads.length || 0}</p>
            <p className="text-gray-400 text-xs">Total Loads</p>
          </div>
          
          <div className="p-4 rounded-2xl border border-[#1e4029] bg-[#162d1e]">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/20 mb-2">
              <TrendingDown className="h-4 w-4 text-amber-400" />
            </div>
            <p className="text-2xl font-bold text-amber-400">₹{totalSaved.toLocaleString()}</p>
            <p className="text-gray-400 text-xs">Total Saved</p>
          </div>
          
          <div className="p-4 rounded-2xl border border-[#1e4029] bg-[#162d1e]">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-500/20 mb-2">
              <Target className="h-4 w-4 text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-blue-400">{poolEfficiency}%</p>
            <p className="text-gray-400 text-xs">Pool Efficiency</p>
          </div>
        </div>

        {/* 5. RECENT ACTIVITY */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-white">Recent Activity</h4>
            <button 
              onClick={() => router.push("/dashboard/loads")}
              className="text-green-400 text-sm flex items-center gap-1 hover:underline"
            >
              View all <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          
          {recentLoads.length > 0 ? (
            recentLoads.map((load) => (
              <div
                key={load.id}
                className="flex items-center justify-between p-4 rounded-2xl border border-[#1e4029] bg-[#162d1e] hover:bg-[#1a3524] hover:border-[#22c55e] transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-500/20">
                    <Wheat className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{load.crop_type}</p>
                    <p className="text-xs text-gray-400">{load.destination}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium",
                      load.status === "delivered" && "bg-green-500/20 text-green-400",
                      load.status === "pending" && "bg-yellow-500/20 text-yellow-400",
                      load.status === "pooled" && "bg-blue-500/20 text-blue-400",
                      load.status === "in_transit" && "bg-amber-500/20 text-amber-400",
                      ["assigned", "accepted"].includes(load.status) && "bg-purple-500/20 text-purple-400"
                    )}
                  >
                    {load.status}
                  </span>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(load.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 border border-[#1e4029] rounded-2xl bg-[#162d1e]">
              <Package className="h-8 w-8 text-gray-500 mx-auto mb-2" />
              <p className="text-gray-400">No loads yet</p>
              <p className="text-gray-500 text-sm">Create your first load request</p>
            </div>
          )}
        </div>

        {/* Weather Widget */}
        {weather && (
          <div className="p-5 rounded-2xl border border-[#1e4029] bg-[#162d1e]" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-amber-500/20">
                  <Cloud className="h-7 w-7 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{weather.temp}°C</p>
                  <p className="text-sm text-gray-400">{weather.location}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-200">{weather.condition}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Droplets className="h-3 w-3" /> {weather.humidity}%
                  </span>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Wind className="h-3 w-3" /> {weather.windSpeed} km/h
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Voice Input Section - Glass Card */}
        <div 
          className="rounded-3xl border border-[#1e4029] bg-[#162d1e] backdrop-blur-xl"
          style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)" }}
        >
          <div className="p-6">
            <h3 className="text-lg font-semibold text-white mb-6 text-center">
              How can we help you today?
            </h3>

            <div className="space-y-4">
              <div className="flex justify-center py-4">
                <VoiceInput onResult={handleVoiceResult} />
              </div>

              <div className="space-y-2">
                <p className="text-sm text-gray-400">Transcript</p>
                <Input
                  value={voiceTranscript}
                  readOnly
                  placeholder="Your spoken words will appear here"
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                  style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      <GlassNav active="Home" />
    </div>
  );
}