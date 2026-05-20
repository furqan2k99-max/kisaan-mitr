"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAppStore";
import { mandiPricesApi, MandiPrice } from "@/lib/api";
import { formatCurrency, cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, TrendingUp, MapPin, Calendar, Search, IndianRupee } from "lucide-react";

const DARK_THEME_BG = "bg-[linear-gradient(135deg,#0d2d1a_0%,#0f2a1d_25%,#1a1200_75%,#1a1200_100%)]";
const GLASS_CARD = "border border-white/10 bg-white/5 backdrop-blur-xl rounded-2xl";

const COMMODITIES = [
  "Tomato", "Potato", "Onion", "Garlic", "Ginger",
  "Wheat", "Rice", "Maize", "Mustard", "Soybean",
  "Banana", "Mango", "Apple", "Grapes", "Orange",
];

const STATES = [
  "Karnataka", "Maharashtra", "Uttar Pradesh", "Gujarat", "Punjab",
  "Madhya Pradesh", "Tamil Nadu", "West Bengal", "Rajasthan", "Haryana",
];

export default function MandiPricesPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [prices, setPrices] = useState<MandiPrice[]>([]);
  const [commodity, setCommodity] = useState("");
  const [state, setState] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  const fetchPrices = async () => {
    if (!commodity) {
      setError("Please select a crop/commodity");
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const params: any = { commodity, limit: 20 };
      if (state) params.state = state;
      const data = await mandiPricesApi.getPrices(params);
      setPrices(data.prices);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to fetch prices");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className={cn("min-h-screen pb-24", DARK_THEME_BG)}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-green-400" />
          Mandi Prices
        </h1>
        <p className="text-slate-400">Live prices from Agmarknet (Government of India)</p>
      </div>

      <Card className={GLASS_CARD}>
        <CardContent className="p-6 space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Crop / Commodity *</label>
              <select
                value={commodity}
                onChange={(e) => setCommodity(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10 text-white"
              >
                <option value="">Select crop...</option>
                {COMMODITIES.map((c) => (
                  <option key={c} value={c} className="bg-slate-800">{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-2 block">State (optional)</label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10 text-white"
              >
                <option value="">All states</option>
                {STATES.map((s) => (
                  <option key={s} value={s} className="bg-slate-800">{s}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button 
                onClick={fetchPrices} 
                disabled={isLoading || !commodity}
                className="w-full bg-gradient-to-r from-green-600 to-green-500 shadow-lg shadow-green-500/30"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                Get Prices
              </Button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {prices.length > 0 && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-slate-400">{prices.length} markets found</p>
          </div>
          
          {prices.map((price, idx) => (
            <Card key={idx} className={GLASS_CARD}>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-green-400" />
                      <span className="font-semibold text-slate-100">{price.market}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm text-slate-400">
                      <span>{price.district}</span>
                      <span>•</span>
                      <span>{price.state}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {price.arrival_date}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <div className="text-center">
                      <p className="text-xs text-slate-500">Min</p>
                      <p className="font-medium text-slate-300">₹{price.min_price.toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-500">Max</p>
                      <p className="font-medium text-slate-300">₹{price.max_price.toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-amber-500">Modal</p>
                      <p className="font-bold text-amber-400">₹{price.modal_price.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {prices.length === 0 && !isLoading && !error && (
        <div className="mt-12 text-center">
          <TrendingUp className="h-16 w-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">Select a crop to see live mandi prices</p>
          <p className="text-sm text-slate-500 mt-2">Prices are fetched from Government of India's Agmarknet portal</p>
        </div>
      )}
    </div>
  );
}