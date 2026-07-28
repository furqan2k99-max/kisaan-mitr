import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
}

// Request interceptor — attach auth token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (authToken && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

// Response interceptor — handle 401 with token refresh attempt
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Attempt token refresh from persisted Zustand state
      try {
        const stored = localStorage.getItem("kisaan-mitr-auth");
        if (stored) {
          const parsed = JSON.parse(stored);
          const refreshToken = parsed?.state?.refreshToken;
          if (refreshToken) {
            const { data } = await axios.post(`${API_URL}/auth/refresh`, {
              refresh_token: refreshToken,
            });
            setAuthToken(data.access_token);

            // Update persisted store
            parsed.state.accessToken = data.access_token;
            localStorage.setItem("kisaan-mitr-auth", JSON.stringify(parsed));

            // Update in-memory Zustand store too (so UI stays in sync)
            try {
              const mod = await import("@/store/useAppStore");
              mod.useAuthStore.setState({
                accessToken: data.access_token,
                isAuthenticated: true,
              });
            } catch {
              // ignore
            }

            // Retry original request
            originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
            return api(originalRequest);
          }
        }
      } catch {
        // Refresh failed — redirect to login
      }

      setAuthToken(null);
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// ── Types ───────────────────────────────────────────────────────────────────

export type AuthRole = "farmer" | "driver" | "admin";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: AuthRole;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
}

export interface RefreshResponse {
  access_token: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: "farmer" | "fpo" | "driver" | "admin";
  language_preference: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function authUserToUser(authUser: AuthUser, overrides: Partial<User> = {}): User {
  const nowIso = new Date().toISOString();
  return {
    id: authUser.id,
    email: authUser.email,
    full_name: authUser.name,
    phone: "",
    role: authUser.role,
    language_preference: "en",
    is_active: true,
    created_at: nowIso,
    updated_at: nowIso,
    ...overrides,
  };
}

export interface LoadRequest {
  id: string;
  farmer_id: string;
  weight_kg: number;
  crop_type: string;
  crop_variety?: string;
  origin_address: string;
  destination_mandi: string;
  pickup_date: string;
  pickup_time_window_start?: string;
  pickup_time_window_end?: string;
  status:
    | "pending"
    | "pooled"
    | "assigned"
    | "in_transit"
    | "delivered"
    | "cancelled";
  expected_price?: number;
  created_at: string;
  updated_at: string;
}

export interface Trip {
  id: string;
  truck_id?: string;
  truck?: Truck;
  mandi_destination: string;
  total_distance_km?: number;
  total_weight_kg?: number;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  scheduled_pickup_start?: string;
  estimated_arrival?: string;
  base_fare?: number;
  platform_commission_rate: number;
  total_fare?: number;
  created_at: string;
  trip_loads: TripLoad[];
}

export interface TripLoad {
  load_request_id: string;
  load_request?: {
    id: string;
    origin_address: string;
    crop_type: string;
    weight_kg: number;
  };
  pickup_sequence?: number;
  allocated_weight_kg?: number;
  fare_share?: number;
  payment_status: string;
}

export interface PoolingResult {
  trip: Trip;
  pooled_farmers: number;
  total_weight: number;
  savings_percentage: number;
}

// ── API Modules ─────────────────────────────────────────────────────────────

export const authApi = {
  login: async (email: string, password: string) => {
    const { data } = await api.post<AuthResponse>("/auth/login", { email, password });
    return data;
  },
  register: async (userData: {
    email: string;
    password: string;
    phone: string;
    name: string;
    role: AuthRole;
  }) => {
    const { data } = await api.post<AuthResponse>("/auth/register", userData);
    return data;
  },
  getMe: async (config?: { timeout?: number; signal?: AbortSignal }): Promise<User> => {
    const { data } = await api.get<AuthUser>("/auth/me", config);
    return authUserToUser(data);
  },
};

export const loadRequestApi = {
  list: async (params?: {
    status?: string;
    skip?: number;
    limit?: number;
  }) => {
    const { data } = await api.get<LoadRequest[]>("/load-requests", {
      params,
    });
    return data;
  },
  get: async (id: string) => {
    const { data } = await api.get<LoadRequest>(`/load-requests/${id}`);
    return data;
  },
  create: async (loadData: {
    weight_kg: number;
    crop_type: string;
    crop_variety?: string;
    origin: { lat: number; lon: number };
    origin_address: string;
    destination_mandi: string;
    destination: { lat: number; lon: number };
    pickup_date: string;
    pickup_time_window_start?: string;
    pickup_time_window_end?: string;
  }) => {
    const { data } = await api.post<LoadRequest>("/load-requests", loadData);
    return data;
  },
  update: async (id: string, updates: Partial<LoadRequest>) => {
    const { data } = await api.put<LoadRequest>(
      `/load-requests/${id}`,
      updates
    );
    return data;
  },
  delete: async (id: string) => {
    await api.delete(`/load-requests/${id}`);
  },
};

export const tripApi = {
  list: async (params?: {
    status?: string;
    skip?: number;
    limit?: number;
  }) => {
    const { data } = await api.get<Trip[]>("/trips", { params });
    return data;
  },
  get: async (id: string) => {
    const { data } = await api.get<Trip>(`/trips/${id}`);
    return data;
  },
  updateStatus: async (id: string, newStatus: string) => {
    const { data } = await api.put<Trip>(`/trips/${id}/status`, null, {
      params: { new_status: newStatus },
    });
    return data;
  },
};

export const poolingApi = {
  trigger: async (loadId: string) => {
    const { data } = await api.post<PoolingResult>("/pooling/trigger", null, {
      params: { load_id: loadId },
    });
    return data;
  },
  getNearby: async (params: {
    lat: number;
    lon: number;
    radius_km?: number;
    mandi?: string;
  }) => {
    const { data } = await api.get("/pooling/nearby", { params });
    return data;
  },
  analyze: async (loadId: string): Promise<PoolAnalysisResponse> => {
    const { data } = await api.get<PoolAnalysisResponse>(`/pooling/analyze/${loadId}`);
    return data;
  },
  confirm: async (loadId: string) => {
    const { data } = await api.post(`/pooling/confirm?load_id=${loadId}`);
    return data;
  },
};

export const nlpApi = {
  transcribe: async (audioData: string) => {
    const { data } = await api.post("/nlp/transcribe", {
      audio_data: audioData,
    });
    return data;
  },
};

export const geocodingApi = {
  reverseGeocode: async (lat: number, lon: number) => {
    const { data } = await api.get("/geocoding/reverse", {
      params: { lat, lon },
    });
    return data;
  },
  distanceMatrix: async (
    origins: number[][],
    destinations: number[][]
  ) => {
    const { data } = await api.post("/geocoding/distance-matrix", {
      origins,
      destinations,
    });
    return data;
  },
};

export interface MandiInfo {
  id: string;
  name: string;
  state: string;
  district: string;
  address?: string;
  lat: number;
  lon: number;
}

export interface Truck {
  id: string;
  registration_number: string;
  truck_type: "tata_ace" | "pickup" | "mini_truck" | "truck";
  capacity_kg: number;
  driver_id?: string;
  is_available: boolean;
  insurance_expiry?: string;
  permit_expiry?: string;
  created_at: string;
}

export const mandisApi = {
  list: async (): Promise<MandiInfo[]> => {
    const { data } = await api.get<MandiInfo[]>("/mandis");
    return data;
  },
};

export interface PoolAnalysisResponse {
  truck_capacity: number;
  base_fare: number;
  platform_commission: number;
  destination: string;
  eta_minutes: number;
  current_user_id: string;
  farmers: {
    id: string;
    name: string;
    crop: string;
    crop_emoji: string;
    weight_kg: number;
    distance_km: number;
  }[];
  total_weight: number;
  capacity_percentage: number;
  savings_percentage: number;
}

export const trucksApi = {
  list: async () => {
    const { data } = await api.get<Truck[]>("/admin/trucks");
    return data;
  },
  get: async (id: string) => {
    const { data } = await api.get<Truck>(`/admin/trucks/${id}`);
    return data;
  },
  create: async (truckData: Partial<Truck>) => {
    const { data } = await api.post<Truck>("/admin/trucks", truckData);
    return data;
  },
  update: async (id: string, updates: Partial<Truck>) => {
    const { data } = await api.put<Truck>(`/admin/trucks/${id}`, updates);
    return data;
  },
  delete: async (id: string) => {
    await api.delete(`/admin/trucks/${id}`);
  },
};

export interface MandiPrice {
  market: string;
  district: string;
  state: string;
  commodity: string;
  min_price: number;
  max_price: number;
  modal_price: number;
  arrival_date: string;
}

export interface MandiPricesResponse {
  prices: MandiPrice[];
  count: number;
}

export const mandiPricesApi = {
  getPrices: async (params: { commodity?: string; state?: string; district?: string; limit?: number } = {}) => {
    const { data } = await api.get<MandiPricesResponse>("/mandi-prices/", { params });
    return data;
  },
  getCommodities: async () => {
    const { data } = await api.get<{ commodities: string[] }>("/mandi-prices/commodities");
    return data;
  },
};

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

export const notificationsApi = {
  list: async (params: { skip?: number; limit?: number } = {}) => {
    const { data } = await api.get<Notification[]>("/notifications", { params });
    return data;
  },
  getUnreadCount: async () => {
    const { data } = await api.get<{ unread_count: number }>("/notifications/unread-count");
    return data;
  },
  markAsRead: async (id: number) => {
    await api.post(`/notifications/${id}/read`);
  },
  markAllAsRead: async () => {
    await api.post("/notifications/read-all");
  },
  delete: async (id: number) => {
    await api.delete(`/notifications/${id}`);
  },
};

export interface PriceAlert {
  id: number;
  commodity: string;
  state?: string;
  target_price: number;
  is_active: boolean;
  triggered_at?: string;
  created_at: string;
}

export const priceAlertsApi = {
  list: async () => {
    const { data } = await api.get<PriceAlert[]>("/price-alerts");
    return data;
  },
  create: async (alert: { commodity: string; state?: string; target_price: number }) => {
    const { data } = await api.post<PriceAlert>("/price-alerts", alert);
    return data;
  },
  delete: async (id: number) => {
    await api.delete(`/price-alerts/${id}`);
  },
  toggle: async (id: number) => {
    const { data } = await api.put<{ is_active: boolean }>(`/price-alerts/${id}/toggle`);
    return data;
  },
};

export interface Rating {
  id: number;
  from_user_id: string;
  to_user_id: string;
  trip_id?: string;
  rating: number;
  comment?: string;
  created_at: string;
}

export const ratingsApi = {
  getReceived: async () => {
    const { data } = await api.get<Rating[]>("/ratings/received");
    return data;
  },
  getGiven: async () => {
    const { data } = await api.get<Rating[]>("/ratings/given");
    return data;
  },
  create: async (rating: { to_user_id: string; trip_id?: string; rating: number; comment?: string }) => {
    const { data } = await api.post<Rating>("/ratings", rating);
    return data;
  },
  getUserStats: async (userId: string) => {
    const { data } = await api.get<{ average: number; count: number }>(`/ratings/user/${userId}`);
    return data;
  },
};

export interface DriverStatus {
  online: boolean;
  available_for?: string;
}

export const driverApi = {
  getStatus: async () => {
    const { data } = await api.get<DriverStatus>("/driver/status");
    return data;
  },
  updateStatus: async (status: { online: boolean; available_for?: string }) => {
    const { data } = await api.put<DriverStatus>("/driver/status", status);
    return data;
  },
};