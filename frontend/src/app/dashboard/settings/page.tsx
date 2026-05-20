"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Bell,
  Moon,
  Globe,
  Shield,
  HelpCircle,
  Info,
  ChevronRight,
  User,
  Truck,
  Package,
  CreditCard,
  MapPin,
} from "lucide-react";

interface SettingItemProps {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  onClick: () => void;
  showArrow?: boolean;
}

function SettingItem({ icon: Icon, title, subtitle, onClick, showArrow = true }: SettingItemProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 rounded-2xl border border-[#1e4029] bg-[#162d1e] hover:bg-[#1a3524] hover:border-[#22c55e] transition-all duration-300"
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-500/20">
        <Icon className="h-5 w-5 text-green-400" />
      </div>
      <div className="flex-1 text-left">
        <p className="text-white font-medium">{title}</p>
        <p className="text-gray-400 text-xs">{subtitle}</p>
      </div>
      {showArrow && <ChevronRight className="h-5 w-5 text-gray-500" />}
    </button>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [language, setLanguage] = useState("en");

  const initials = user?.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "U";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()} className="text-gray-400 hover:text-white">
          ← Back
        </Button>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
      </div>

      {/* Profile Card */}
      <div className="p-6 rounded-2xl border border-[#1e4029] bg-[#162d1e]">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-green-600 text-white text-xl font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-white font-semibold text-lg">{user?.full_name}</p>
            <p className="text-gray-400 text-sm">{user?.phone}</p>
            <p className="text-green-400 text-xs capitalize">{user?.role}</p>
          </div>
        </div>
      </div>

      {/* Account Settings */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-white px-2">Account</h2>
        <SettingItem
          icon={User}
          title="Personal Information"
          subtitle="Update your name, phone, and profile"
          onClick={() => router.push("/dashboard/profile")}
        />
        <SettingItem
          icon={Package}
          title="My Loads"
          subtitle="View and manage your load requests"
          onClick={() => router.push("/dashboard/loads")}
        />
        <SettingItem
          icon={Truck}
          title="My Trips"
          subtitle="Track your trip history and status"
          onClick={() => router.push("/dashboard/trips")}
        />
        <SettingItem
          icon={CreditCard}
          title="Payments & Wallet"
          subtitle="View transactions and earnings"
          onClick={() => router.push("/dashboard/payments")}
        />
      </div>

      {/* Preferences */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-white px-2">Preferences</h2>
        
        <div className="p-4 rounded-2xl border border-[#1e4029] bg-[#162d1e] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-500/20">
              <Bell className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-white font-medium">Notifications</p>
              <p className="text-gray-400 text-xs">Push notifications for updates</p>
            </div>
          </div>
          <button
            onClick={() => setNotifications(!notifications)}
            className={cn(
              "w-12 h-6 rounded-full transition-colors",
              notifications ? "bg-green-500" : "bg-gray-600"
            )}
          >
            <div
              className={cn(
                "w-5 h-5 rounded-full bg-white transition-transform",
                notifications ? "translate-x-6" : "translate-x-0.5"
              )}
            />
          </button>
        </div>

        <div className="p-4 rounded-2xl border border-[#1e4029] bg-[#162d1e] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-500/20">
              <Moon className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-white font-medium">Dark Mode</p>
              <p className="text-gray-400 text-xs">Always on</p>
            </div>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={cn(
              "w-12 h-6 rounded-full transition-colors",
              darkMode ? "bg-green-500" : "bg-gray-600"
            )}
          >
            <div
              className={cn(
                "w-5 h-5 rounded-full bg-white transition-transform",
                darkMode ? "translate-x-6" : "translate-x-0.5"
              )}
            />
          </button>
        </div>

        <SettingItem
          icon={Globe}
          title="Language"
          subtitle={language === "en" ? "English" : "ಕನ್ನಡ"}
          onClick={() => setLanguage(language === "en" ? "kn" : "en")}
        />
      </div>

      {/* Support */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-white px-2">Support</h2>
        <SettingItem
          icon={HelpCircle}
          title="Help Center"
          subtitle="FAQs and customer support"
          onClick={() => alert("Help Center coming soon!")}
        />
        <SettingItem
          icon={Shield}
          title="Privacy Policy"
          subtitle="How we handle your data"
          onClick={() => alert("Privacy Policy coming soon!")}
        />
        <SettingItem
          icon={Info}
          title="About"
          subtitle="Version 1.0.0"
          onClick={() => alert("Kisaan Mitr v1.0.0\nAgriPool AI Platform")}
        />
      </div>

      {/* Location Settings */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-white px-2">Location</h2>
        <SettingItem
          icon={MapPin}
          title="Saved Locations"
          subtitle="Manage pickup and delivery addresses"
          onClick={() => alert("Location management coming soon!")}
        />
      </div>
    </div>
  );
}