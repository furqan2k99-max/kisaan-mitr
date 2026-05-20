"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAppStore";
import { useTrucks, useCreateTruck, useDeleteTruck } from "@/hooks/useApi";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Truck, Plus, Loader2, AlertCircle, CheckCircle2, X } from "lucide-react";

const DARK_THEME_BG = "bg-[linear-gradient(135deg,#0d2d1a_0%,#0f2a1d_25%,#1a1200_75%,#1a1200_100%)]";
const GLASS_CARD = "border border-white/10 bg-white/5 backdrop-blur-xl rounded-2xl";

const truckTypeLabels: Record<string, string> = {
  tata_ace: "Tata Ace (800kg)",
  pickup: "Pickup (1 ton)",
  mini_truck: "Mini Truck (2 ton)",
  truck: "Truck (5 ton)",
};

export default function FleetPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { data: trucks, isLoading, error } = useTrucks();
  const createTruckMutation = useCreateTruck();
  const deleteTruckMutation = useDeleteTruck();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({
    registration_number: "",
    truck_type: "tata_ace",
    capacity_kg: "800",
  });

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "admin") {
      router.push("/login");
    }
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || user?.role !== "admin") return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTruckMutation.mutateAsync({
        registration_number: formData.registration_number,
        truck_type: formData.truck_type as "tata_ace" | "pickup" | "mini_truck" | "truck",
        capacity_kg: parseInt(formData.capacity_kg),
        is_available: true,
      });
      setIsAddOpen(false);
      setFormData({ registration_number: "", truck_type: "tata_ace", capacity_kg: "800" });
    } catch (err) {
      console.error("Failed to add truck:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this truck?")) {
      try {
        await deleteTruckMutation.mutateAsync(id);
      } catch (err) {
        console.error("Failed to delete truck:", err);
      }
    }
  };

  const availableTrucks = trucks?.filter((t) => t.is_available).length || 0;
  const busyTrucks = (trucks?.length || 0) - availableTrucks;

  return (
    <div className={cn("min-h-screen pb-24", DARK_THEME_BG)}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Fleet Management</h1>
          <p className="text-slate-400">Manage your truck fleet</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-green-600 to-green-500 shadow-lg shadow-green-500/30">
              <Plus className="mr-2 h-4 w-4" />Add Truck
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-white/10">
            <DialogHeader>
              <DialogTitle className="text-slate-100">Add New Truck</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Registration Number</Label>
                <Input
                  placeholder="e.g., KA01AB1234"
                  value={formData.registration_number}
                  onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                  required
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Truck Type</Label>
                <Select value={formData.truck_type} onValueChange={(v) => setFormData({ ...formData, truck_type: v })}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    {Object.entries(truckTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value} className="text-slate-100 focus:bg-white/10">{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Capacity (kg)</Label>
                <Input
                  type="number"
                  value={formData.capacity_kg}
                  onChange={(e) => setFormData({ ...formData, capacity_kg: e.target.value })}
                  required
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="flex-1 border-white/20 text-slate-300 hover:bg-white/10">Cancel</Button>
                <Button type="submit" className="flex-1 bg-gradient-to-r from-green-600 to-green-500 shadow-lg shadow-green-500/30" disabled={createTruckMutation.isPending}>
                  {createTruckMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Truck"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className={GLASS_CARD}>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-blue-400">{trucks?.length || 0}</p>
            <p className="text-sm text-slate-400">Total Trucks</p>
          </CardContent>
        </Card>
        <Card className={GLASS_CARD}>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-green-400">{availableTrucks}</p>
            <p className="text-sm text-slate-400">Available</p>
          </CardContent>
        </Card>
        <Card className={GLASS_CARD}>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-orange-400">{busyTrucks}</p>
            <p className="text-sm text-slate-400">On Trip</p>
          </CardContent>
        </Card>
      </div>

      {/* Trucks List */}
      <Card className={GLASS_CARD}>
        <CardHeader className="bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-t-lg border-b border-white/10">
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            All Trucks
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-red-400">
              <AlertCircle className="h-8 w-8 mb-2" />
              <p>Failed to load trucks</p>
            </div>
          ) : trucks?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Truck className="h-16 w-16 mb-4 text-slate-600" />
              <p className="text-lg font-medium text-slate-300">No trucks yet</p>
              <p className="text-sm">Add your first truck to get started</p>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {trucks?.map((truck) => (
                <div key={truck.id} className="p-4 hover:bg-white/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn("p-3 rounded-lg", truck.is_available ? "bg-green-500/20" : "bg-orange-500/20")}>
                        <Truck className={cn("h-5 w-5", truck.is_available ? "text-green-400" : "text-orange-400")} />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-100">{truck.registration_number}</p>
                        <p className="text-sm text-slate-400">{truckTypeLabels[truck.truck_type]}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-medium text-slate-200">{truck.capacity_kg}kg</p>
                        <p className="text-xs text-slate-500">capacity</p>
                      </div>
                      <span className={cn("px-2 py-1 rounded text-xs font-medium", 
                        truck.is_available ? "bg-green-500/20 text-green-400" : "bg-orange-500/20 text-orange-400")}>
                        {truck.is_available ? "Available" : "On Trip"}
                      </span>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(truck.id)} className="text-slate-500 hover:text-red-400">
                        <X className="h-4 w-4" />
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