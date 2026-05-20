import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { User } from "@/lib/api";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setUser: (user: User | null) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      hasHydrated: false,
      setAuth: (user, accessToken, refreshToken) =>
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
        }),
      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
        }),
      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        }),
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
    }),
    {
      name: "kisaan-mitr-auth",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      migrate: (persistedState: any) => {
        // Normalize older persisted shapes and drop stale flags.
        const accessToken = persistedState?.accessToken ?? null;
        const refreshToken = persistedState?.refreshToken ?? null;
        const user = persistedState?.user ?? null;

        return {
          user,
          accessToken,
          refreshToken,
        };
      },
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          try {
            // Corrupt storage should not brick the UI.
            useAuthStore.persist?.clearStorage?.();
          } catch {
            // ignore
          }
        }

        // Ensure invariants after hydration: auth is derived from the token,
        // and hydration flag always flips even if storage was empty.
        useAuthStore.setState({
          hasHydrated: true,
          isAuthenticated: !!state?.accessToken,
        });
      },
    }
  )
);

interface UIState {
  sidebarOpen: boolean;
  theme: "light" | "dark";
  language: "en" | "kn" | "hi";
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setTheme: (theme: "light" | "dark") => void;
  setLanguage: (language: "en" | "kn" | "hi") => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: "light",
      language: "en",
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
    }),
    {
      name: "kisaan-mitr-ui",
    }
  )
);

interface LoadRequestDraft {
  weight_kg: number | null;
  crop_type: string;
  crop_variety: string;
  origin_address: string;
  origin_lat: number | null;
  origin_lon: number | null;
  destination_mandi: string;
  destination_lat: number | null;
  destination_lon: number | null;
  pickup_date: string;
  voice_input_raw: string;
  setField: <K extends keyof LoadRequestDraft>(
    key: K,
    value: LoadRequestDraft[K]
  ) => void;
  reset: () => void;
}

const initialDraft: Omit<LoadRequestDraft, "setField" | "reset"> = {
  weight_kg: null,
  crop_type: "",
  crop_variety: "",
  origin_address: "",
  origin_lat: null,
  origin_lon: null,
  destination_mandi: "",
  destination_lat: null,
  destination_lon: null,
  pickup_date: "",
  voice_input_raw: "",
};

export const useLoadRequestDraft = create<LoadRequestDraft>()((set) => ({
  ...initialDraft,
  setField: (key, value) => set((state) => ({ ...state, [key]: value })),
  reset: () => set(initialDraft),
}));