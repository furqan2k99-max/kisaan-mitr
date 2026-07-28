"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAppStore";
import { priceAlertsApi, PriceAlert } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Trash2, ToggleLeft, Plus, TrendingUp } from "lucide-react";

const COMMON_COMMODITIES = [
  "Potato", "Tomato", "Onion", "Carrot", "Cabbage", "Cauliflower",
  "Wheat", "Rice", "Maize", "Soybean", "Mustard", "Cotton"
];

const STATES = [
  "Karnataka", "Maharashtra", "Uttar Pradesh", "Madhya Pradesh", "Gujarat",
  "Rajasthan", "Tamil Nadu", "West Bengal", "Punjab", "Haryana"
];

export default function PriceAlertsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ commodity: "", state: "", target_price: "" });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    fetchAlerts();
  }, [isAuthenticated, router]);

  const fetchAlerts = async () => {
    try {
      const data = await priceAlertsApi.list();
      setAlerts(data);
    } catch (error) {
      console.error("Failed to fetch alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.commodity || !formData.target_price) return;

    try {
      const newAlert = await priceAlertsApi.create({
        commodity: formData.commodity,
        state: formData.state || undefined,
        target_price: parseFloat(formData.target_price),
      });
      setAlerts([newAlert, ...alerts]);
      setShowForm(false);
      setFormData({ commodity: "", state: "", target_price: "" });
    } catch (error) {
      console.error("Failed to create alert:", error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await priceAlertsApi.delete(id);
      setAlerts(alerts.filter(a => a.id !== id));
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  const handleToggle = async (id: number) => {
    try {
      const result = await priceAlertsApi.toggle(id);
      setAlerts(alerts.map(a => a.id === id ? { ...a, is_active: result.is_active } : a));
    } catch (error) {
      console.error("Failed to toggle:", error);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Price Alerts</h1>
          <p className="text-gray-400 text-sm">Get notified when prices reach your target</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Alert
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleCreateAlert} className="p-6 rounded-2xl border border-[#1e4029] bg-[#162d1e] space-y-4">
          <div>
            <Label className="text-gray-300">Commodity</Label>
            <Select value={formData.commodity} onValueChange={(v) => setFormData({ ...formData, commodity: v })}>
              <SelectTrigger className="bg-[#1a3524] border-[#1e4029] text-white">
                <SelectValue placeholder="Select commodity" />
              </SelectTrigger>
              <SelectContent className="bg-[#162d1e] border-[#1e4029]">
                {COMMON_COMMODITIES.map(c => (
                  <SelectItem key={c} value={c} className="text-white">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-gray-300">State (Optional)</Label>
            <Select value={formData.state} onValueChange={(v) => setFormData({ ...formData, state: v })}>
              <SelectTrigger className="bg-[#1a3524] border-[#1e4029] text-white">
                <SelectValue placeholder="Any state" />
              </SelectTrigger>
              <SelectContent className="bg-[#162d1e] border-[#1e4029]">
                <SelectItem value="any" className="text-white">Any State</SelectItem>
                {STATES.map(s => (
                  <SelectItem key={s} value={s} className="text-white">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-gray-300">Target Price (₹/quintal)</Label>
            <Input
              type="number"
              value={formData.target_price}
              onChange={(e) => setFormData({ ...formData, target_price: e.target.value })}
              placeholder="e.g., 1500"
              className="bg-[#1a3524] border-[#1e4029] text-white"
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="bg-green-600 hover:bg-green-700">
              Create Alert
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="border-[#1e4029] text-gray-300">
              Cancel
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-12 border border-[#1e4029] rounded-2xl bg-[#162d1e]">
          <Bell className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">No price alerts set</p>
          <p className="text-gray-500 text-sm">Create an alert to get notified</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-2xl border transition-all duration-300 ${
                alert.is_active 
                  ? "border-[#1e4029] bg-[#162d1e]" 
                  : "border-gray-700 bg-gray-800/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-500/20">
                    <TrendingUp className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium">{alert.commodity}</h3>
                    <p className="text-gray-400 text-sm">
                      Target: ₹{alert.target_price}/q {alert.state && `in ${alert.state}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggle(alert.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      alert.is_active 
                        ? "bg-green-500/20 text-green-400" 
                        : "bg-gray-600/20 text-gray-400"
                    }`}
                  >
                    {alert.is_active ? "Active" : "Paused"}
                  </button>
                  <button
                    onClick={() => handleDelete(alert.id)}
                    className="p-2 text-gray-400 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
