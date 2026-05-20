"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAppStore";
import { useCreateLoadRequest } from "@/hooks/useApi";
import { mandisApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Calendar, Package, Loader2, LocateFixed, ArrowLeft, Wheat, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { VoiceInput } from "@/components/VoiceInput";
import { useGeolocation } from "@/hooks/useGeolocation";

const DARK_THEME_BG = "bg-[linear-gradient(135deg,#0d2d1a_0%,#0f2a1d_25%,#1a1200_75%,#1a1200_100%)]";
const GLASS_CARD = "border border-white/10 bg-white/5 backdrop-blur-xl rounded-2xl";

const CROP_TYPES = ["Tomato", "Potato", "Onion", "Rice", "Wheat", "Sugarcane", "Coffee", "Cotton", "Groundnut", "Maize"];

interface MandiOption {
  name: string;
  lat: number;
  lon: number;
}

function parseVoiceInput(transcript: string): { weight?: string; crop?: string; address?: string } {
  const result: { weight?: string; crop?: string; address?: string } = {};
  const lower = transcript.toLowerCase();

  const weightMatch = lower.match(/(\d+)\s*(kg|kilo|kilogram)/);
  if (weightMatch) {
    result.weight = weightMatch[1];
  } else {
    const numMatch = lower.match(/(\d+)/);
    if (numMatch && parseInt(numMatch[1]) < 1000) {
      result.weight = numMatch[1];
    }
  }

  const cropKeywords: Record<string, string> = {
    tomato: "tomato", tomatoes: "tomato",
    potato: "potato", potatoes: "potato",
    onion: "onion", onions: "onion",
    rice: "rice",
    wheat: "wheat",
    sugarcane: "sugarcane",
    coffee: "coffee",
    cotton: "cotton",
    groundnut: "groundnut",
    maize: "maize", corn: "maize",
  };

  for (const [keyword, crop] of Object.entries(cropKeywords)) {
    if (lower.includes(keyword)) {
      result.crop = crop;
      break;
    }
  }

  return result;
}

export default function NewLoadPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const createLoadMutation = useCreateLoadRequest();
  const { location, address, loading: locationLoading, error: locationError, getLocation } = useGeolocation();

  const [mandis, setMandis] = useState<MandiOption[]>([]);
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState({
    weight_kg: "",
    crop_type: "",
    origin_address: "",
    destination_mandi: "",
    pickup_date: "",
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    mandisApi.list().then((data) => {
      setMandis(data.map((m) => ({ name: m.name, lat: m.lat, lon: m.lon })));
    }).catch(() => {
      setMandis([{ name: "Mysore (Bandipalya APMC)", lat: 12.2958, lon: 76.6394 }]);
    });

    getLocation();
  }, [isAuthenticated, router, getLocation]);

  useEffect(() => {
    if (address) {
      setFormData((prev) => ({ ...prev, origin_address: address }));
    }
  }, [address]);

  const handleVoiceResult = useCallback((transcript: string) => {
    const parsed = parseVoiceInput(transcript);
    const newAutoFilled = new Set<string>();

    if (parsed.weight) {
      setFormData((prev) => ({ ...prev, weight_kg: parsed.weight! }));
      newAutoFilled.add("weight");
    }
    if (parsed.crop) {
      setFormData((prev) => ({ ...prev, crop_type: parsed.crop! }));
      newAutoFilled.add("crop");
    }

    setAutoFilledFields(newAutoFilled);

    setTimeout(() => setAutoFilledFields(new Set()), 3000);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const originLat = location?.lat ?? 12.2958;
    const originLon = location?.lng ?? 76.6394;
    const selectedMandi = mandis.find((m) => m.name === formData.destination_mandi);
    const destLat = selectedMandi?.lat ?? 12.2958;
    const destLon = selectedMandi?.lon ?? 76.6394;

    try {
      await createLoadMutation.mutateAsync({
        weight_kg: parseInt(formData.weight_kg),
        crop_type: formData.crop_type,
        origin: { lat: originLat, lon: originLon },
        origin_address: formData.origin_address,
        destination_mandi: formData.destination_mandi,
        destination: { lat: destLat, lon: destLon },
        pickup_date: formData.pickup_date,
      });

      router.push("/dashboard/loads");
    } catch (error) {
      console.error("Failed to create load request:", error);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className={cn("min-h-screen pb-24", DARK_THEME_BG)}>
      <style jsx>{`
        @keyframes pulse-dot {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
          50% { box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-slate-300 hover:bg-white/10">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-100">New Transport Request</h1>
          <p className="text-slate-400">Fill in your load details</p>
        </div>
      </div>

      <Card className={GLASS_CARD}>
        <CardHeader 
          className="rounded-t-lg border-b border-white/10"
          style={{ background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)" }}
        >
          <CardTitle className="flex items-center gap-2 text-white">
            <Package className="h-5 w-5" />
            Load Details
          </CardTitle>
          <CardDescription className="text-green-100">
            Use voice input in Kannada for hands-free entry
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Voice Input Section */}
            <div 
              className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-4"
              style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}
            >
              <p className="text-sm text-slate-400 mb-4 text-center">Tap to speak in Kannada</p>
              <VoiceInput onResult={handleVoiceResult} />
            </div>

            {/* Weight & Crop */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="weight" className="text-slate-300">Weight (kg) *</Label>
                  {autoFilledFields.has("weight") && (
                    <span className="flex items-center gap-1 text-xs text-green-400">
                      <Sparkles className="h-3 w-3" />
                      Parsed from voice
                    </span>
                  )}
                </div>
                <Input
                  id="weight"
                  type="number"
                  placeholder="e.g., 200"
                  value={formData.weight_kg}
                  onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                  required
                  min={1}
                  max={800}
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-green-500 focus:ring-green-500/20"
                  style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }}
                />
                <p className="text-xs text-slate-500">Max 800kg per request</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-slate-300">Crop Type *</Label>
                  {autoFilledFields.has("crop") && (
                    <span className="flex items-center gap-1 text-xs text-green-400">
                      <Sparkles className="h-3 w-3" />
                      Parsed from voice
                    </span>
                  )}
                </div>
                <Select value={formData.crop_type} onValueChange={(value) => setFormData({ ...formData, crop_type: value })}>
                  <SelectTrigger 
                    className="bg-white/5 border-white/10 text-white focus:border-green-500"
                    style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }}
                  >
                    <SelectValue placeholder="Select crop" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    {CROP_TYPES.map((crop) => (
                      <SelectItem key={crop} value={crop.toLowerCase()} className="text-slate-100 focus:bg-white/10">
                        {crop}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Origin Address with Geolocation */}
            <div className="space-y-2">
              <Label className="text-slate-300">Pickup Address *</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Enter your village/address"
                  className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-green-500 focus:ring-green-500/20"
                  style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }}
                  value={formData.origin_address}
                  onChange={(e) => setFormData({ ...formData, origin_address: e.target.value })}
                  required
                />
                <button
                  type="button"
                  className="absolute right-2 top-2 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                  onClick={getLocation}
                  title="Detect my location"
                  disabled={locationLoading}
                >
                  {locationLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-green-500" style={{ filter: "drop-shadow(0 0 5px rgba(34, 197, 94, 0.5))" }} />
                  ) : location ? (
                    <div className="relative">
                      <LocateFixed className="h-4 w-4 text-green-400" style={{ filter: "drop-shadow(0 0 5px rgba(34, 197, 94, 0.5))" }} />
                      <div className="absolute inset-0 w-4 h-4 rounded-full bg-green-500 animate-pulse" style={{ animation: "pulse-dot 2s infinite" }} />
                    </div>
                  ) : (
                    <LocateFixed className="h-4 w-4 text-slate-500" />
                  )}
                </button>
              </div>
              {locationLoading && (
                <p className="text-xs text-slate-400 flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Detecting location...
                </p>
              )}
              {location && !locationLoading && (
                <p className="text-xs text-green-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" style={{ boxShadow: "0 0 8px rgba(34, 197, 94, 0.5)" }} />
                  📍 {address || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}
                </p>
              )}
              {locationError && !locationLoading && (
                <p className="text-xs text-amber-400">{locationError}. Enter manually.</p>
              )}
            </div>

            {/* Destination Mandi */}
            <div className="space-y-2">
              <Label className="text-slate-300">Destination Mandi *</Label>
              <Select value={formData.destination_mandi} onValueChange={(value) => setFormData({ ...formData, destination_mandi: value })}>
                <SelectTrigger 
                  className="bg-white/5 border-white/10 text-white focus:border-green-500"
                  style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }}
                >
                  <SelectValue placeholder="Select Mandi" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  {mandis.map((m) => (
                    <SelectItem key={m.name} value={m.name} className="text-slate-100 focus:bg-white/10">
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Pickup Date */}
            <div className="space-y-2">
              <Label className="text-slate-300">Pickup Date *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input
                  type="date"
                  className="pl-10 bg-white/5 border-white/10 text-white focus:border-green-500"
                  style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }}
                  value={formData.pickup_date}
                  onChange={(e) => setFormData({ ...formData, pickup_date: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => router.back()} 
                className="flex-1 border-white/20 text-slate-300 hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1 text-white border-0 transition-all duration-300 hover:scale-[1.02]"
                style={{ 
                  background: "linear-gradient(135deg, #16a34a 0%, #22c55e 50%, #16a34a 100%)",
                  boxShadow: "0 4px 20px rgba(34, 197, 94, 0.4)",
                }}
                disabled={createLoadMutation.isPending}
              >
                {createLoadMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</>
                ) : (
                  <><Package className="mr-2 h-4 w-4" />Submit Request</>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}