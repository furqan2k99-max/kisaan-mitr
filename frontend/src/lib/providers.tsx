"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAppStore";
import { setAuthToken } from "@/lib/api";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  // Ensure persisted Zustand state rehydrates on the client.
  useEffect(() => {
    // Kick hydration (safe to call multiple times).
    useAuthStore.persist?.rehydrate?.();

    const unsubscribe = useAuthStore.persist?.onFinishHydration?.((state) => {
      useAuthStore.setState({
        hasHydrated: true,
        isAuthenticated: !!state?.accessToken,
      });
    });

    // Failsafe: never block UI forever.
    const timer = window.setTimeout(() => {
      useAuthStore.setState((s) => ({
        hasHydrated: true,
        isAuthenticated: !!s.accessToken,
      }));
    }, 2000);

    return () => {
      window.clearTimeout(timer);
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  // Restore auth token from persisted Zustand state on mount
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    setAuthToken(accessToken);
  }, [accessToken]);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}