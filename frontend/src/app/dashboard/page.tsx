"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAppStore";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push("/login");
      return;
    }

    switch (user.role) {
      case "admin":
        router.replace("/dashboard/admin");
        break;
      case "driver":
        router.replace("/dashboard/driver");
        break;
      case "farmer":
      case "fpo":
      default:
        router.replace("/dashboard/farmer");
    }
  }, [isAuthenticated, user, router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
    </div>
  );
}