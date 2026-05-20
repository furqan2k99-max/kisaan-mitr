"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Phone, Mail, MapPin, Shield, Loader2, Save } from "lucide-react";

const DARK_THEME_BG = "bg-[linear-gradient(135deg,#0d2d1a_0%,#0f2a1d_25%,#1a1200_75%,#1a1200_100%)]";
const GLASS_CARD = "border border-white/10 bg-white/5 backdrop-blur-xl rounded-2xl";

const roleConfig: Record<string, { color: string; bg: string; label: string }> = {
  farmer: { color: "text-green-400", bg: "bg-green-500", label: "Farmer" },
  driver: { color: "text-blue-400", bg: "bg-blue-500", label: "Driver" },
  admin: { color: "text-purple-400", bg: "bg-purple-500", label: "Admin" },
  fpo: { color: "text-orange-400", bg: "bg-orange-500", label: "FPO" },
};

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    email: "",
    language_preference: "en",
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    
    if (user) {
      setFormData({
        full_name: user.full_name || "",
        phone: user.phone || "",
        email: user.email || "",
        language_preference: user.language_preference || "en",
      });
    }
  }, [isAuthenticated, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      alert("Profile updated successfully!");
    }, 1000);
  };

  if (!isAuthenticated || !user) return null;

  const rc = roleConfig[user.role] || roleConfig.farmer;
  const initials = user.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "U";

  return (
    <div className={cn("min-h-screen pb-24", DARK_THEME_BG)}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Profile Settings</h1>
        <p className="text-slate-400">Manage your account information</p>
      </div>

      {/* Profile Card */}
      <Card className={GLASS_CARD}>
        <CardHeader className="bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-t-lg border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className={cn("w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold", rc.bg)}>
              {initials}
            </div>
            <div>
              <CardTitle className="text-slate-100">{user.full_name}</CardTitle>
              <CardDescription className="text-slate-300">{user.email}</CardDescription>
              <span className={cn("inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium", rc.color, "bg-white/10")}>
                {rc.label}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-slate-300">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-slate-300">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                  disabled
                />
              </div>
              <p className="text-xs text-slate-500">Phone number cannot be changed</p>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                  disabled
                />
              </div>
              <p className="text-xs text-slate-500">Email cannot be changed</p>
            </div>

            {/* Language */}
            <div className="space-y-2">
              <Label className="text-slate-300">Language Preference</Label>
              <Select value={formData.language_preference} onValueChange={(v) => setFormData({ ...formData, language_preference: v })}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  <SelectItem value="en" className="text-slate-100 focus:bg-white/10">English</SelectItem>
                  <SelectItem value="kn" className="text-slate-100 focus:bg-white/10">Kannada</SelectItem>
                  <SelectItem value="hi" className="text-slate-100 focus:bg-white/10">Hindi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Submit */}
            <Button type="submit" className="w-full bg-gradient-to-r from-green-600 to-green-500 shadow-lg shadow-green-500/30" disabled={isSaving}>
              {isSaving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
              ) : (
                <><Save className="mr-2 h-4 w-4" />Save Changes</>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card className={GLASS_CARD}>
        <CardHeader className="border-b border-white/10 bg-white/5">
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <Shield className="h-5 w-5" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-400">User ID</span>
              <span className="font-mono text-sm text-slate-200">{user.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Role</span>
              <span className="capitalize font-medium text-slate-200">{user.role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Account Status</span>
              <span className={cn("px-2 py-0.5 rounded text-xs font-medium", user.is_active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400")}>
                {user.is_active ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Joined</span>
              <span className="text-sm text-slate-200">{new Date(user.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}