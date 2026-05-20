"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, useLoadRequestDraft } from "@/store/useAppStore";
import {
  useLoadRequests,
  useCreateLoadRequest,
  useTrips,
} from "@/hooks/useApi";
import { setAuthToken, nlpApi, mandisApi, MandiInfo } from "@/lib/api";
import { formatCurrency, formatDate, formatDateTime, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Truck,
  Package,
  MapPin,
  Calendar,
  Mic,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Navigation,
  Wheat,
  IndianRupee,
  LocateFixed,
} from "lucide-react";

const CROP_TYPES = [
  "Tomato",
  "Potato",
  "Onion",
  "Rice",
  "Wheat",
  "Sugarcane",
  "Coffee",
  "Cotton",
  "Groundnut",
  "Maize",
];

// Mandis fetched from API
interface MandiOption {
  name: string;
  lat: number;
  lon: number;
}

export function FarmerDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const draft = useLoadRequestDraft();

  const [isRecording, setIsRecording] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [mandis, setMandis] = useState<MandiOption[]>([]);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const {
    data: loadRequests,
    isLoading: isLoadingLoads,
    error: loadsError,
  } = useLoadRequests();
  const { data: trips, isLoading: isLoadingTrips } = useTrips();
  const createLoadMutation = useCreateLoadRequest();

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
    }
  }, [isAuthenticated, router]);

  // Auto-detect location on mount + fetch mandis
  useEffect(() => {
    requestGeolocation();
    mandisApi.list().then((data) => {
      setMandis(data.map((m) => ({ name: m.name, lat: m.lat, lon: m.lon })));
    }).catch(() => {
      // Fallback if API is unreachable
      setMandis([{ name: "Mysore (Bandipalya APMC)", lat: 12.2958, lon: 76.6394 }]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestGeolocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setIsLocating(false);
      },
      (err) => {
        console.warn("Geolocation denied, using Mysuru default:", err.message);
        // Default to Mysuru center
        setUserLocation({ lat: 12.2958, lon: 76.6394 });
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const handleLogout = () => {
    logout();
    setAuthToken(null);
    router.push("/login");
  };

  // ── Voice Recording ────────────────────────────────────────────────────

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/wav",
        });
        stream.getTracks().forEach((t) => t.stop());

        // Convert to base64 and send to Bhashini
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(",")[1];
          try {
            const result = await nlpApi.transcribe(base64);
            if (result) {
              // Auto-fill form from NLP result
              if (result.weight_kg)
                setFormData((p) => ({
                  ...p,
                  weight_kg: String(result.weight_kg),
                }));
              if (result.crop_type)
                setFormData((p) => ({ ...p, crop_type: result.crop_type }));
              if (result.destination_mandi) {
                const match = mandis.find((m) =>
                  m.name
                    .toLowerCase()
                    .includes(result.destination_mandi.toLowerCase())
                );
                if (match)
                  setFormData((p) => ({
                    ...p,
                    destination_mandi: match.name,
                  }));
              }
              if (result.pickup_date)
                setFormData((p) => ({ ...p, pickup_date: result.pickup_date }));
            }
          } catch (err) {
            console.error("Transcription error:", err);
          }
        };
        reader.readAsDataURL(audioBlob);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleVoiceToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // ── Form Submit ────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Use browser geolocation or Mysuru default
    const originLat = userLocation?.lat ?? 12.2958;
    const originLon = userLocation?.lon ?? 76.6394;

    // Resolve destination mandi coordinates
    const selectedMandi = mandis.find(
      (m) => m.name === formData.destination_mandi
    );
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

      setFormData({
        weight_kg: "",
        crop_type: "",
        origin_address: "",
        destination_mandi: "",
        pickup_date: "",
      });
      draft.reset();
    } catch (error) {
      console.error("Failed to create load request:", error);
    }
  };

  // ── Status Helpers ─────────────────────────────────────────────────────

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      pooled: "bg-blue-100 text-blue-800",
      assigned: "bg-purple-100 text-purple-800",
      in_transit: "bg-orange-100 text-orange-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "pooled":
      case "delivered":
        return <CheckCircle2 className="h-4 w-4" />;
      case "in_transit":
        return <Truck className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-green-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white rounded-full p-2">
              <Wheat className="h-8 w-8 text-green-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Kisaan Mitr</h1>
              <p className="text-green-200 text-sm">
                AgriPool AI - Smart Logistics
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="font-medium">{user?.full_name}</p>
              <p className="text-green-200 text-sm">{user?.phone}</p>
            </div>
            <Button
              variant="outline"
              className="bg-green-800 text-white border-green-600 hover:bg-green-900"
              onClick={handleLogout}
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column — form + loads */}
          <div className="lg:col-span-2 space-y-6">
            {/* Create Load Request */}
            <Card className="shadow-md">
              <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-lg">
                <CardTitle className="flex items-center space-x-2">
                  <Plus className="h-5 w-5" />
                  <span>Create New Transport Request</span>
                </CardTitle>
                <CardDescription className="text-green-100">
                  Fill in your load details or use voice input in Kannada
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="weight">Weight (kg)</Label>
                      <Input
                        id="weight"
                        type="number"
                        placeholder="e.g., 200"
                        value={formData.weight_kg}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            weight_kg: e.target.value,
                          })
                        }
                        required
                        min={1}
                        max={800}
                      />
                      <p className="text-xs text-gray-500">
                        Max 800kg per request
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="crop">Crop Type</Label>
                      <Select
                        value={formData.crop_type}
                        onValueChange={(value) =>
                          setFormData({ ...formData, crop_type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select crop" />
                        </SelectTrigger>
                        <SelectContent>
                          {CROP_TYPES.map((crop) => (
                            <SelectItem key={crop} value={crop.toLowerCase()}>
                              {crop}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="origin">Pickup Address</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="origin"
                        placeholder="Enter your village/address"
                        className="pl-10 pr-10"
                        value={formData.origin_address}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            origin_address: e.target.value,
                          })
                        }
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-2 p-1 rounded hover:bg-gray-100"
                        onClick={requestGeolocation}
                        title="Detect my location"
                      >
                        {isLocating ? (
                          <Loader2 className="h-4 w-4 animate-spin text-green-600" />
                        ) : (
                          <LocateFixed className="h-4 w-4 text-green-600" />
                        )}
                      </button>
                    </div>
                    {userLocation && (
                      <p className="text-xs text-green-600">
                        📍 Location: {userLocation.lat.toFixed(4)},{" "}
                        {userLocation.lon.toFixed(4)}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mandi">Destination Mandi</Label>
                    <Select
                      value={formData.destination_mandi}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          destination_mandi: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Mandi" />
                      </SelectTrigger>
                      <SelectContent>
                        {mandis.map((m) => (
                          <SelectItem key={m.name} value={m.name}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date">Pickup Date</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="date"
                        type="date"
                        className="pl-10"
                        value={formData.pickup_date}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            pickup_date: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={createLoadMutation.isPending}
                    >
                      {createLoadMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Package className="mr-2 h-4 w-4" />
                          Submit Request
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "border-green-600 text-green-700 hover:bg-green-50",
                        isRecording &&
                          "bg-red-50 border-red-500 text-red-600"
                      )}
                      onClick={handleVoiceToggle}
                    >
                      <Mic
                        className={cn(
                          "mr-2 h-4 w-4",
                          isRecording && "animate-pulse"
                        )}
                      />
                      {isRecording
                        ? "Stop Recording"
                        : "Voice Input (Kannada)"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* My Load Requests */}
            <Card className="shadow-md">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
                <CardTitle className="flex items-center space-x-2">
                  <Truck className="h-5 w-5" />
                  <span>My Load Requests</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {isLoadingLoads ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : loadsError ? (
                  <div className="text-center py-8 text-red-600">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                    <p>Failed to load requests</p>
                  </div>
                ) : loadRequests?.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No load requests yet</p>
                    <p className="text-sm">Create your first request above</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {loadRequests?.map((load) => (
                      <div
                        key={load.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="bg-green-100 p-3 rounded-full">
                            <Package className="h-5 w-5 text-green-700" />
                          </div>
                          <div>
                            <p className="font-medium capitalize">
                              {load.crop_type}
                            </p>
                            <p className="text-sm text-gray-500">
                              {load.weight_kg}kg • {load.destination_mandi}
                            </p>
                            <p className="text-xs text-gray-400">
                              {formatDate(load.pickup_date)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          {load.expected_price && (
                            <div className="text-right">
                              <p className="font-semibold text-green-700">
                                {formatCurrency(load.expected_price)}
                              </p>
                            </div>
                          )}
                          <span
                            className={cn(
                              "px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1",
                              getStatusColor(load.status)
                            )}
                          >
                            {getStatusIcon(load.status)}
                            <span className="capitalize">
                              {load.status.replace("_", " ")}
                            </span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column — trips + stats */}
          <div className="space-y-6">
            {/* Active Trips */}
            <Card className="shadow-md">
              <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center space-x-2">
                  <Truck className="h-5 w-5" />
                  <span>Active Trips</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {isLoadingTrips ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
                  </div>
                ) : (trips?.filter((t) => t.status !== "completed").length ??
                    0) === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Truck className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No active trips</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {trips
                      ?.filter((t) => t.status !== "completed")
                      .slice(0, 3)
                      .map((trip) => (
                        <div
                          key={trip.id}
                          className="p-4 bg-orange-50 rounded-lg"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">
                              {trip.mandi_destination}
                            </span>
                            <span
                              className={cn(
                                "px-2 py-1 rounded text-xs font-medium",
                                trip.status === "scheduled" &&
                                  "bg-blue-100 text-blue-800",
                                trip.status === "in_progress" &&
                                  "bg-orange-100 text-orange-800"
                              )}
                            >
                              {trip.status.replace("_", " ")}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm text-gray-600">
                            <span className="flex items-center">
                              <Navigation className="h-3 w-3 mr-1" />
                              {trip.total_weight_kg}kg
                            </span>
                            <span className="flex items-center">
                              <IndianRupee className="h-3 w-3 mr-1" />
                              {trip.total_fare
                                ? formatCurrency(trip.total_fare)
                                : "Calculating..."}
                            </span>
                          </div>
                          {trip.trip_loads && trip.trip_loads.length > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                              {trip.trip_loads.length} farmer
                              {trip.trip_loads.length > 1 ? "s" : ""} pooled
                            </p>
                          )}
                          {trip.scheduled_pickup_start && (
                            <p className="text-xs text-gray-500 mt-1">
                              Pickup:{" "}
                              {formatDateTime(trip.scheduled_pickup_start)}
                            </p>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="shadow-md">
              <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-t-lg">
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <p className="text-3xl font-bold text-purple-700">
                      {loadRequests?.filter((l) => l.status === "delivered")
                        .length || 0}
                    </p>
                    <p className="text-sm text-purple-600">Deliveries</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <p className="text-3xl font-bold text-purple-700">
                      {loadRequests?.filter((l) => l.status === "pending")
                        .length || 0}
                    </p>
                    <p className="text-sm text-purple-600">Pending</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <p className="text-3xl font-bold text-purple-700">
                      {trips?.length || 0}
                    </p>
                    <p className="text-sm text-purple-600">Total Trips</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <p className="text-3xl font-bold text-purple-700">
                      {trips?.reduce(
                        (acc, t) => acc + (t.trip_loads?.length || 0),
                        0
                      ) || 0}
                    </p>
                    <p className="text-sm text-purple-600">Pooled Farmers</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}