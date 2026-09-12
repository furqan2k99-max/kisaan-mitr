"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CheckCircle,
  XCircle,
  Edit3,
  Loader2,
  Wheat,
  Package,
  MapPin,
  Calendar,
  Truck,
  IndianRupee,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

const CROP_TYPES = ["Tomato", "Potato", "Onion", "Rice", "Wheat", "Sugarcane", "Cotton", "Maize", "Pulses", "Coffee", "Groundnut"];

interface BookingData {
  booking_id: string;
  crop_type: string;
  weight_kg: number;
  pickup_date: string;
  origin: { address: string; lat: number; lon: number };
  destination_mandi: { name: string; lat: number; lon: number };
  distance_km: number;
  estimated_fare: string;
  pooled_fare_estimate: string;
  savings_estimate: string;
  status: string;
  missing_fields: string[];
  confidence_score: number;
  nearby_mandis?: { name: string; lat: number; lon: number }[];
}

interface VoiceBookingConfirmationProps {
  bookingData: BookingData;
  onConfirm: () => void;
  onCancel: () => void;
  isConfirming?: boolean;
}

/**
 * VoiceBookingConfirmation — Step 3 of the voice booking flow.
 * Displays parsed booking details in an editable card.
 * Shows confidence indicator and fare estimate.
 * Allows farmer to edit any field before confirming.
 */
export default function VoiceBookingConfirmation({
  bookingData,
  onConfirm,
  onCancel,
  isConfirming = false,
}: VoiceBookingConfirmationProps) {
  const [editing, setEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    crop_type: bookingData.crop_type || "Other",
    weight_kg: bookingData.weight_kg,
    pickup_date: bookingData.pickup_date,
    origin_address: bookingData.origin.address,
    destination_mandi: bookingData.destination_mandi.name,
  });

  const mandiOptions = useMemo(() => {
    const names = new Set<string>();
    const options = [{ name: bookingData.destination_mandi.name }];
    if (bookingData.nearby_mandis) {
      bookingData.nearby_mandis.forEach(m => names.add(m.name));
    }
    names.forEach(n => options.push({ name: n }));
    return options;
  }, [bookingData.destination_mandi.name, bookingData.nearby_mandis]);

  const confidence = bookingData.confidence_score;
  const confidenceColor =
    confidence > 0.8 ? "text-green-400" : confidence >= 0.5 ? "text-yellow-400" : "text-red-400";
  const confidenceBg =
    confidence > 0.8 ? "bg-green-500/10 border-green-500/20" : confidence >= 0.5 ? "bg-yellow-500/10 border-yellow-500/20" : "bg-red-500/10 border-red-500/20";
  const confidenceLabel =
    confidence > 0.8 ? "Understood clearly" : confidence >= 0.5 ? "Please verify details" : "Couldn't understand well, please edit";

  const missingSet = new Set([...bookingData.missing_fields, "destination_mandi"]);

  const handleFieldSave = (field: string) => {
    setEditing(null);
  };

  return (
    <div className="space-y-4">
      {/* Confidence Indicator */}
      <div className={cn("p-3 rounded-xl border flex items-center gap-3", confidenceBg)}>
        {confidence > 0.8 ? (
          <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
        ) : confidence >= 0.5 ? (
          <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0" />
        ) : (
          <XCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
        )}
        <div>
          <p className={cn("text-sm font-medium", confidenceColor)}>{confidenceLabel}</p>
          <p className="text-xs text-gray-400">Confidence: {Math.round(confidence * 100)}%</p>
        </div>
      </div>

      {/* Booking Details Card */}
      <div className="rounded-2xl border border-white/10 bg-[#162d1e] overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-green-400" />
            Booking Summary
          </h3>
        </div>

        <div className="divide-y divide-white/5">
          {/* Crop Type */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wheat className="h-4 w-4 text-green-400" />
              <div>
                <p className="text-xs text-gray-400">Crop</p>
                {editing === "crop_type" ? (
                  <Select
                    value={formData.crop_type}
                    onValueChange={(v) => setFormData({ ...formData, crop_type: v })}
                  >
                    <SelectTrigger className="h-8 w-40 bg-white/5 border-white/10 text-white text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10">
                      {CROP_TYPES.map((c) => (
                        <SelectItem key={c} value={c} className="text-white text-sm">
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className={cn("font-medium", missingSet.has("crop_type") ? "text-yellow-400" : "text-white")}>
                    {formData.crop_type || "Not specified"}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => setEditing(editing === "crop_type" ? null : "crop_type")}
              className="p-1 rounded-lg hover:bg-white/10 text-gray-400"
            >
              <Edit3 className="h-4 w-4" />
            </button>
          </div>

          {/* Weight */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="h-4 w-4 text-green-400" />
              <div>
                <p className="text-xs text-gray-400">Weight</p>
                {editing === "weight_kg" ? (
                  <Input
                    type="number"
                    min={1}
                    max={800}
                    value={formData.weight_kg}
                    onChange={(e) => setFormData({ ...formData, weight_kg: parseInt(e.target.value) || 0 })}
                    className="h-8 w-24 bg-white/5 border-white/10 text-white text-sm"
                  />
                ) : (
                  <p className={cn("font-medium", missingSet.has("weight_kg") ? "text-yellow-400" : "text-white")}>
                    {formData.weight_kg} kg
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => setEditing(editing === "weight_kg" ? null : "weight_kg")}
              className="p-1 rounded-lg hover:bg-white/10 text-gray-400"
            >
              <Edit3 className="h-4 w-4" />
            </button>
          </div>

          {/* Pickup Date */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-green-400" />
              <div>
                <p className="text-xs text-gray-400">Pickup Date</p>
                {editing === "pickup_date" ? (
                  <Input
                    type="date"
                    value={formData.pickup_date}
                    onChange={(e) => setFormData({ ...formData, pickup_date: e.target.value })}
                    className="h-8 w-40 bg-white/5 border-white/10 text-white text-sm"
                  />
                ) : (
                  <p className={cn("font-medium", missingSet.has("pickup_date") ? "text-yellow-400" : "text-white")}>
                    {formData.pickup_date}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => setEditing(editing === "pickup_date" ? null : "pickup_date")}
              className="p-1 rounded-lg hover:bg-white/10 text-gray-400"
            >
              <Edit3 className="h-4 w-4" />
            </button>
          </div>

          {/* Origin */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-green-400" />
              <div>
                <p className="text-xs text-gray-400">Pickup Location</p>
                {editing === "origin" ? (
                  <Input
                    value={formData.origin_address}
                    onChange={(e) => setFormData({ ...formData, origin_address: e.target.value })}
                    className="h-8 w-56 bg-white/5 border-white/10 text-white text-sm"
                  />
                ) : (
                  <p className={cn("font-medium text-sm", missingSet.has("origin_location") ? "text-yellow-400" : "text-white")}>
                    {formData.origin_address}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => setEditing(editing === "origin" ? null : "origin")}
              className="p-1 rounded-lg hover:bg-white/10 text-gray-400"
            >
              <Edit3 className="h-4 w-4" />
            </button>
          </div>

          {/* Destination */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Truck className="h-4 w-4 text-green-400" />
              <div>
                <p className="text-xs text-gray-400">Destination Mandi</p>
                {editing === "destination" ? (
                  <Select
                    value={formData.destination_mandi}
                    onValueChange={(v) => setFormData({ ...formData, destination_mandi: v })}
                  >
                    <SelectTrigger className="h-8 w-56 bg-white/5 border-white/10 text-white text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10">
                      {mandiOptions.map((m) => (
                        <SelectItem key={m.name} value={m.name} className="text-white text-sm">
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="font-medium text-white">{formData.destination_mandi}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => setEditing(editing === "destination" ? null : "destination")}
              className="p-1 rounded-lg hover:bg-white/10 text-gray-400"
            >
              <Edit3 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Fare Estimate */}
      <div
        className="p-4 rounded-2xl border border-green-500/20 bg-green-500/5"
        style={{ boxShadow: "0 4px 20px rgba(34, 197, 94, 0.1)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <IndianRupee className="h-4 w-4 text-green-400" />
          <p className="text-sm font-medium text-green-400">Fare Estimate</p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Distance</span>
            <span className="text-white">{bookingData.distance_km} km</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Standard fare</span>
            <span className="text-white">{bookingData.estimated_fare}</span>
          </div>
          <div className="border-t border-white/5 pt-2 flex justify-between">
            <span className="text-green-400 font-medium">If pooled (save {bookingData.savings_estimate.split("(")[1]?.replace(")", "") || "40%"})</span>
            <span className="text-green-400 font-bold text-lg">{bookingData.pooled_fare_estimate}</span>
          </div>
        </div>
      </div>

      {/* Missing Fields Warning */}
      {bookingData.missing_fields.length > 0 && (
        <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
          <p className="text-yellow-400 text-sm font-medium">
            Missing information: {bookingData.missing_fields.join(", ")}
          </p>
          <p className="text-yellow-400/70 text-xs mt-1">Please edit the fields above to complete your booking.</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <Button
          onClick={onCancel}
          variant="outline"
          className="flex-1 h-12 border-white/20 text-gray-300 hover:bg-white/10 rounded-xl min-h-[48px]"
          disabled={isConfirming}
        >
          <XCircle className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          className={cn(
            "flex-1 h-12 text-white font-medium rounded-xl transition-all duration-300 min-h-[48px]",
            isConfirming
              ? "bg-green-700 cursor-not-allowed"
              : "bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/30 hover:scale-[1.02]"
          )}
          disabled={isConfirming}
        >
          {isConfirming ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Confirming...</>
          ) : (
            <><CheckCircle className="mr-2 h-4 w-4" />Confirm Booking</>
          )}
        </Button>
      </div>
    </div>
  );
}
