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
import { Wheat, Loader2, AlertCircle, Leaf } from "lucide-react";

const DARK_EARTHY_BG = "bg-[linear-gradient(135deg,#0d2d1a_0%,#0f2a1d_25%,#1a1200_75%,#1a1200_100%)]";

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const getErrorMessage = (err: any): string => {
    const detail = err?.response?.data?.detail;
    if (!detail) return "Login failed. Please try again.";
    if (typeof detail === "string") return detail;

    try {
      return JSON.stringify(detail);
    } catch {
      return "Login failed. Please try again.";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const tokenResponse = await authApi.login(email, password);
      setAuthToken(tokenResponse.access_token);
      setAuth(
        authUserToUser(tokenResponse.user),
        tokenResponse.access_token,
        tokenResponse.refresh_token
      );
      router.push("/dashboard");
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
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(34, 197, 94, 0.3), 0 0 40px rgba(34, 197, 94, 0.1); }
          50% { box-shadow: 0 0 30px rgba(34, 197, 94, 0.5), 0 0 60px rgba(34, 197, 94, 0.2); }
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
      `}</style>

      {/* Background decorative orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-green-500/10 to-transparent blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-amber-500/8 to-transparent blur-3xl" />
        <div className="absolute top-1/2 left-1/4 w-[300px] h-[300px] rounded-full bg-gradient-to-r from-green-400/5 to-transparent blur-3xl" />
      </div>

      {/* Main Glass Card */}
      <Card className="w-full max-w-md mx-4 relative z-10"
        style={{
          background: "rgba(255, 255, 255, 0.05)",
          backdropFilter: "blur(20px) saturate(180%)",
          border: "1px solid rgba(255, 255, 255, 0.10)",
          borderRadius: "20px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1), 0 0 0 1px rgba(34,197,94,0.05)",
        }}>
        <CardHeader className="space-y-1 text-center pb-6 pt-8">
          {/* Logo with green glow */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div 
                className="absolute inset-0 rounded-full blur-xl"
                style={{ background: "radial-gradient(circle, rgba(34,197,94,0.6) 0%, transparent 70%)" }}
              />
              <div 
                className="relative rounded-full p-5"
                style={{
                  background: "linear-gradient(135deg, #16a34a 0%, #22c55e 50%, #16a34a 100%)",
                  boxShadow: "0 4px 20px rgba(34,197,94,0.4), 0 0 30px rgba(34,197,94,0.2)",
                }}
              >
                <Wheat className="h-12 w-12 text-white" />
              </div>
            </div>
          </div>
          <CardTitle 
            className="text-3xl font-bold text-white"
            style={{ textShadow: "0 0 30px rgba(34,197,94,0.3)" }}
          >
            Welcome Back
          </CardTitle>
          <CardDescription className="text-slate-400 text-base">
            Login to your Kisaan Mitr account
          </CardDescription>
        </CardHeader>
        
        <CardContent className="px-8 pb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
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

            <div className="space-y-3">
              <Label htmlFor="email" className="text-slate-300 font-medium ml-1">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="farmer@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="glass-input h-12 px-4 text-white bg-white/5 border border-white/10 rounded-xl focus:border-green-500 focus:ring-0 transition-all"
                style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.10)" }}
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="password" className="text-slate-300 font-medium ml-1">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="glass-input h-12 px-4 text-white bg-white/5 border border-white/10 rounded-xl focus:border-green-500 focus:ring-0 transition-all"
                style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.10)" }}
              />
            </div>

            <Button 
              type="submit" 
              className="shiny-button w-full h-12 text-lg font-semibold rounded-xl text-white border-0 transition-all duration-300"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Logging in...
                </>
              ) : (
                <>
                  <Leaf className="mr-2 h-5 w-5" />
                  Login
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 text-center text-sm">
            <span className="text-slate-400">Don&apos;t have an account? </span>
            <button
              onClick={() => router.push("/register")}
              className="text-green-400 hover:text-green-300 font-semibold transition-colors ml-1"
              style={{ textShadow: "0 0 10px rgba(34, 197, 94, 0.3)" }}
            >
              Register here
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}