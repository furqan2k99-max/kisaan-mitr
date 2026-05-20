"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAppStore";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  Wheat, LogIn, UserPlus, LayoutDashboard, Package, Truck, 
  CreditCard, Wallet, BarChart3, MapPin, Users, Settings,
  ArrowRight, Star, Shield, TrendingDown
} from "lucide-react";

const DARK_THEME_BG = "bg-[linear-gradient(135deg,#0d2d1a_0%,#0f2a1d_25%,#1a1200_75%,#1a1200_100%)]";

const features = [
  { icon: TrendingDown, title: "Save 60%", desc: "Share truck costs with nearby farmers" },
  { icon: Shield, title: "Verified", desc: "Trusted by 1000+ farmers" },
  { icon: Star, title: "4.8 Rating", desc: "Highest rated agri-logistics app" },
];

const pages = [
  { icon: LayoutDashboard, title: "Dashboard", desc: "Role-based overview", href: "/dashboard", color: "bg-gradient-to-br from-emerald-400 to-emerald-500" },
  { icon: Package, title: "Load Requests", desc: "Manage transport requests", href: "/dashboard/loads", color: "bg-gradient-to-br from-blue-400 to-blue-500" },
  { icon: Package, title: "New Request", desc: "Create load request", href: "/dashboard/loads/new", color: "bg-gradient-to-br from-emerald-400 to-emerald-500" },
  { icon: Truck, title: "Trips", desc: "Trip history & tracking", href: "/dashboard/trips", color: "bg-gradient-to-br from-orange-400 to-orange-500" },
  { icon: Truck, title: "Active Trips", desc: "Driver pickup queue", href: "/dashboard/trips/active", color: "bg-gradient-to-br from-amber-400 to-amber-500" },
  { icon: CreditCard, title: "Payments", desc: "Payment history", href: "/dashboard/payments", color: "bg-gradient-to-br from-purple-400 to-purple-500" },
  { icon: Wallet, title: "Earnings", desc: "Driver earnings", href: "/dashboard/earnings", color: "bg-gradient-to-br from-yellow-400 to-yellow-500" },
  { icon: BarChart3, title: "Analytics", desc: "Admin KPIs & charts", href: "/dashboard/analytics", color: "bg-gradient-to-br from-indigo-400 to-indigo-500" },
  { icon: Truck, title: "Fleet", desc: "Truck management", href: "/dashboard/fleet", color: "bg-gradient-to-br from-cyan-400 to-cyan-500" },
  { icon: MapPin, title: "Mandis", desc: "APMC market locations", href: "/dashboard/mandis", color: "bg-gradient-to-br from-teal-400 to-teal-500" },
  { icon: Users, title: "Users", desc: "User management", href: "/dashboard/users", color: "bg-gradient-to-br from-pink-400 to-pink-500" },
  { icon: Settings, title: "Profile", desc: "Account settings", href: "/dashboard/profile", color: "bg-gradient-to-br from-slate-400 to-slate-500" },
];

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && user) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, user, router]);

  return (
    <div className={`min-h-screen relative ${DARK_THEME_BG}`}>
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-gradient-to-br from-green-600/20 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-10 w-72 h-72 bg-gradient-to-bl from-amber-600/15 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 w-80 h-80 bg-gradient-to-tr from-yellow-600/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-gradient-to-tl from-green-500/15 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="bg-black/30 backdrop-blur-xl border-b border-green-500/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-amber-500 rounded-full blur-lg opacity-50" />
              <div className="relative bg-gradient-to-br from-green-600 to-green-500 rounded-full p-2 shadow-lg shadow-green-500/30">
                <Wheat className="h-8 w-8 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100">Kisaan Mitr</h1>
              <p className="text-xs text-green-400 font-medium">AgriPool AI</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => router.push("/login")} className="border-white/20 text-slate-100 hover:bg-white/10 hover:border-green-500/30 bg-white/5">
              <LogIn className="mr-2 h-4 w-4" />Login
            </Button>
            <Button onClick={() => router.push("/register")} className="bg-gradient-to-r from-green-600 to-green-500 shadow-lg shadow-green-500/30">
              <UserPlus className="mr-2 h-4 w-4" />Sign Up
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4 relative">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-100 mb-4">
            Smart Logistics for <span className="bg-gradient-to-r from-green-400 to-amber-400 bg-clip-text text-transparent">Farmers</span>
          </h2>
          <p className="text-lg text-slate-400 mb-8">
            India&apos;s first fractional logistics platform. Pool loads, share trucks, 
            and save up to 60% on transport costs to APMC mandis.
          </p>
          
          {/* Features */}
          <div className="grid grid-cols-3 gap-4 mb-10">
            {features.map((f, i) => (
              <div key={i} className="border border-white/10 bg-white/5 backdrop-blur-xl rounded-2xl p-4 hover:bg-white/8 hover:border-green-500/30 hover:shadow-lg hover:shadow-green-500/10 hover:-translate-y-0.5 transition-all">
                <f.icon className="h-8 w-8 text-green-400 mx-auto mb-2" />
                <p className="font-semibold text-slate-100">{f.title}</p>
                <p className="text-xs text-slate-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pages Grid */}
      <section className="py-12 px-4 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-2xl font-bold text-slate-100 text-center mb-8">
            Explore Our Platform
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {pages.map((page, i) => (
              <Link
                key={i}
                href={page.href}
                className="group border border-white/10 bg-white/5 backdrop-blur-xl rounded-2xl p-5 hover:bg-white/8 hover:border-green-500/30 hover:shadow-lg hover:shadow-green-500/10 hover:-translate-y-0.5 transition-all"
              >
                <div className={`${page.color} w-12 h-12 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg`}>
                  <page.icon className="h-6 w-6 text-white" />
                </div>
                <h4 className="font-semibold text-slate-100 mb-1">{page.title}</h4>
                <p className="text-xs text-slate-400">{page.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 relative">
        <div className="max-w-2xl mx-auto text-center bg-gradient-to-r from-green-600 to-amber-500 rounded-2xl p-8 text-white shadow-2xl shadow-green-500/30">
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-white/10 rounded-full blur-xl" />
          <h3 className="text-2xl font-bold mb-4 relative">Ready to Get Started?</h3>
          <p className="text-green-100 mb-6 relative">
            Join thousands of farmers already saving on transport costs.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center relative">
            <Button 
              onClick={() => router.push("/register")} 
              className="bg-white text-green-700 hover:bg-green-50 font-semibold px-6 py-3 shadow-lg"
            >
              Create Free Account <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button 
              onClick={() => router.push("/login")} 
              variant="outline" 
              className="border-white text-white hover:bg-green-700/50 px-6 py-3"
            >
              Login
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black/40 backdrop-blur-xl text-slate-400 py-8 px-4 border-t border-green-500/20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Wheat className="h-6 w-6 text-green-500" />
            <span className="font-semibold text-slate-100">Kisaan Mitr</span>
          </div>
          <p className="text-sm">Serving 10+ APMC Mandis across Karnataka</p>
        </div>
      </footer>
    </div>
  );
}