"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAppStore";
import { authUserToUser, setAuthToken, authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Wheat, Loader2, AlertCircle, Leaf, Tractor, Truck } from "lucide-react";

const DARK_EARTHY_BG = "bg-[linear-gradient(135deg,#0d2d1a_0%,#0f2a1d_25%,#1a1200_75%,#1a1200_100%)]";

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "farmer",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const getErrorMessage = (err: any): string => {
    const detail = err?.response?.data?.detail;
    if (!detail) return "Registration failed. Please try again.";
    if (typeof detail === "string") return detail;

    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0];
      const msg = first?.msg;
      const loc = Array.isArray(first?.loc) ? first.loc.join(".") : undefined;
      if (typeof msg === "string" && loc) return `${loc}: ${msg}`;
      if (typeof msg === "string") return msg;
    }

    try {
      return JSON.stringify(detail);
    } catch {
      return "Registration failed. Please try again.";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const tokenResponse = await authApi.register({
        name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: (formData.role === "driver" ? "driver" : "farmer"),
      });

      setAuthToken(tokenResponse.access_token);
      setAuth(
        authUserToUser(tokenResponse.user, { phone: formData.phone }),
        tokenResponse.access_token,
        tokenResponse.refresh_token
      );
      router.push("/");
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center relative overflow-hidden ${DARK_EARTHY_BG}`}>
      <style jsx>{`
        @keyframes shimmer {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .shiny-button {
          background: linear-gradient(135deg, #16a34a 0%, #22c55e 50%, #16a34a 100%);
          background-size: 200% 200%;
          animation: shimmer 3s ease infinite;
        }
        .shiny-button:hover {
          background-position: 100% 50%;
          transform: scale(1.02);
          box-shadow: 0 8px 30px rgba(34, 197, 94, 0.5), 0 0 0 1px rgba(34, 197, 94, 0.4);
        }
        .glass-input::placeholder {
          color: #64748b;
        }
        .glass-input:focus {
          box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.3), 0 0 20px rgba(34, 197, 94, 0.1);
        }
        .role-pill {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .role-pill.active {
          background: rgba(34, 197, 94, 0.2);
          border-color: rgba(34, 197, 94, 0.5);
          box-shadow: 0 0 20px rgba(34, 197, 94, 0.2);
        }
        .role-pill:not(.active) {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.1);
        }
        .role-pill:not(.active):hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.2);
        }
      `}</style>

      {/* Background decorative orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-green-500/10 to-transparent blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-amber-500/8 to-transparent blur-3xl" />
        <div className="absolute top-1/2 left-1/4 w-[300px] h-[300px] rounded-full bg-gradient-to-r from-green-400/5 to-transparent blur-3xl" />
      </div>

      {/* Main Glass Card */}
      <Card className="w-full max-w-md mx-4 relative z-10 max-h-[90vh] overflow-y-auto"
        style={{
          background: "rgba(255, 255, 255, 0.05)",
          backdropFilter: "blur(20px) saturate(180%)",
          border: "1px solid rgba(255, 255, 255, 0.10)",
          borderRadius: "20px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1), 0 0 0 1px rgba(34,197,94,0.05)",
        }}>
        <CardHeader className="space-y-1 text-center pb-4 pt-6">
          {/* Logo with green glow */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div 
                className="absolute inset-0 rounded-full blur-xl"
                style={{ background: "radial-gradient(circle, rgba(34,197,94,0.6) 0%, transparent 70%)" }}
              />
              <div 
                className="relative rounded-full p-4"
                style={{
                  background: "linear-gradient(135deg, #16a34a 0%, #22c55e 50%, #16a34a 100%)",
                  boxShadow: "0 4px 20px rgba(34,197,94,0.4), 0 0 30px rgba(34,197,94,0.2)",
                }}
              >
                <Wheat className="h-10 w-10 text-white" />
              </div>
            </div>
          </div>
          <CardTitle 
            className="text-2xl font-bold text-white"
            style={{ textShadow: "0 0 30px rgba(34,197,94,0.3)" }}
          >
            Create Account
          </CardTitle>
          <CardDescription className="text-slate-400">
            Join Kisaan Mitr for smart logistics
          </CardDescription>
        </CardHeader>
        
        <CardContent className="px-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div 
                className="flex items-center p-4 rounded-xl border"
                style={{ 
                  background: "rgba(239, 68, 68, 0.1)", 
                  borderColor: "rgba(239, 68, 68, 0.3)",
                  color: "#fca5a5"
                }}
              >
                <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0" style={{ color: "#fca5a5" }} />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-slate-300 font-medium ml-1">Full Name</Label>
              <Input
                id="full_name"
                type="text"
                placeholder="Enter your full name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
                disabled={isLoading}
                className="glass-input h-11 px-4 text-white bg-white/5 border border-white/10 rounded-xl focus:border-green-500 focus:ring-0 transition-all"
                style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.10)" }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300 font-medium ml-1">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="farmer@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={isLoading}
                className="glass-input h-11 px-4 text-white bg-white/5 border border-white/10 rounded-xl focus:border-green-500 focus:ring-0 transition-all"
                style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.10)" }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-slate-300 font-medium ml-1">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="10-digit mobile number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                disabled={isLoading}
                className="glass-input h-11 px-4 text-white bg-white/5 border border-white/10 rounded-xl focus:border-green-500 focus:ring-0 transition-all"
                style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.10)" }}
              />
            </div>

            {/* Role Selector - Glass Toggle Pills */}
            <div className="space-y-2">
              <Label className="text-slate-300 font-medium ml-1">I am a</Label>
              <div className="grid grid-cols-2 gap-2">
                {/* Farmer */}
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: "farmer" })}
                  className={`role-pill flex flex-col items-center justify-center p-3 rounded-xl border ${formData.role === "farmer" ? "active" : ""}`}
                >
                  <Tractor className={`h-6 w-6 mb-1 ${formData.role === "farmer" ? "text-green-400" : "text-slate-400"}`} />
                  <span className={`text-xs font-medium ${formData.role === "farmer" ? "text-green-400" : "text-slate-400"}`}>Farmer</span>
                </button>
                
                {/* Driver */}
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: "driver" })}
                  className={`role-pill flex flex-col items-center justify-center p-3 rounded-xl border ${formData.role === "driver" ? "active" : ""}`}
                >
                  <Truck className={`h-6 w-6 mb-1 ${formData.role === "driver" ? "text-green-400" : "text-slate-400"}`} />
                  <span className={`text-xs font-medium ${formData.role === "driver" ? "text-green-400" : "text-slate-400"}`}>Driver</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300 font-medium ml-1">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a password (min 8 chars)"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                disabled={isLoading}
                minLength={8}
                className="glass-input h-11 px-4 text-white bg-white/5 border border-white/10 rounded-xl focus:border-green-500 focus:ring-0 transition-all"
                style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.10)" }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-slate-300 font-medium ml-1">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                disabled={isLoading}
                className="glass-input h-11 px-4 text-white bg-white/5 border border-white/10 rounded-xl focus:border-green-500 focus:ring-0 transition-all"
                style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.10)" }}
              />
            </div>

            <Button 
              type="submit" 
              className="shiny-button w-full h-12 text-lg font-semibold rounded-xl text-white border-0 mt-2 transition-all duration-300"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  <Leaf className="mr-2 h-5 w-5" />
                  Register
                </>
              )}
            </Button>
          </form>

          <div className="mt-5 text-center text-sm">
            <span className="text-slate-400">Already have an account? </span>
            <button
              onClick={() => router.push("/login")}
              className="text-green-400 hover:text-green-300 font-semibold transition-colors ml-1"
              style={{ textShadow: "0 0 10px rgba(34, 197, 94, 0.3)" }}
            >
              Login here
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}