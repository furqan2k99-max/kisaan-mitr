"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAppStore";
import { mandisApi, MandiInfo } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MapPin, Plus, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const DARK_THEME_BG = "bg-[linear-gradient(135deg,#0d2d1a_0%,#0f2a1d_25%,#1a1200_75%,#1a1200_100%)]";
const GLASS_CARD = "border border-white/10 bg-white/5 backdrop-blur-xl rounded-2xl";

export default function MandisPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [mandis, setMandis] = useState<MandiInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "admin") {
      router.push("/login");
    } else {
      loadMandis();
    }
  }, [isAuthenticated, user, router]);

  const loadMandis = async () => {
    try {
      const data = await mandisApi.list();
      setMandis(data);
    } catch (err) {
      console.error("Failed to load mandis:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMandis = mandis.filter((m) => 
    !search || m.name.toLowerCase().includes(search.toLowerCase()) || 
    m.district.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={cn("min-h-screen pb-24", DARK_THEME_BG)}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Mandis</h1>
          <p className="text-slate-400">Manage APMC market locations</p>
        </div>
        <Button className="bg-gradient-to-r from-green-600 to-green-500 shadow-lg shadow-green-500/30" onClick={() => setIsAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />Add Mandi
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <Input
          placeholder="Search by name or district..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500"
        />
      </div>

      {/* Mandis Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-green-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMandis.map((mandi) => (
            <Card key={mandi.id} className={cn("hover:bg-white/8 hover:border-green-500/30 hover:shadow-lg hover:shadow-green-500/10 hover:-translate-y-0.5 transition-all", GLASS_CARD)}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <MapPin className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-100">{mandi.name}</h3>
                    <p className="text-sm text-slate-400">{mandi.district}, {mandi.state}</p>
                    {mandi.address && <p className="text-xs text-slate-500 mt-1">{mandi.address}</p>}
                    <p className="text-xs text-slate-500 mt-1">📍 {mandi.lat.toFixed(4)}, {mandi.lon.toFixed(4)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}