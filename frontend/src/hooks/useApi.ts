import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  authApi,
  loadRequestApi,
  tripApi,
  poolingApi,
  trucksApi,
  User,
  LoadRequest,
  Trip,
  PoolingResult,
  Truck,
  authUserToUser,
} from "@/lib/api";

export function useCurrentUser() {
  return useQuery<User>({
    queryKey: ["currentUser"],
    queryFn: authApi.getMe,
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const response = await authApi.login(email, password);
      return response;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["currentUser"], authUserToUser(data.user));
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: authApi.register,
  });
}

export function useLoadRequests(params?: { status?: string; skip?: number; limit?: number }) {
  return useQuery<LoadRequest[]>({
    queryKey: ["loadRequests", params],
    queryFn: () => loadRequestApi.list(params),
  });
}

export function useLoadRequest(id: string) {
  return useQuery<LoadRequest>({
    queryKey: ["loadRequest", id],
    queryFn: () => loadRequestApi.get(id),
    enabled: !!id,
  });
}

export function useCreateLoadRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: loadRequestApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loadRequests"] });
    },
  });
}

export function useUpdateLoadRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<LoadRequest> }) =>
      loadRequestApi.update(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["loadRequest", id] });
      queryClient.invalidateQueries({ queryKey: ["loadRequests"] });
    },
  });
}

export function useDeleteLoadRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: loadRequestApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loadRequests"] });
    },
  });
}

export function useTrips(params?: { status?: string; skip?: number; limit?: number }) {
  return useQuery<Trip[]>({
    queryKey: ["trips", params],
    queryFn: () => tripApi.list(params),
  });
}

export function useTrip(id: string) {
  return useQuery<Trip>({
    queryKey: ["trip", id],
    queryFn: () => tripApi.get(id),
    enabled: !!id,
  });
}

export function useTriggerPooling() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: poolingApi.trigger,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["loadRequests"] });
    },
  });
}

export function useNearbyFarmers(params: { lat: number; lon: number; radius_km?: number; mandi?: string }) {
  return useQuery({
    queryKey: ["nearbyFarmers", params],
    queryFn: () => poolingApi.getNearby(params),
    enabled: params.lat !== 0 && params.lon !== 0,
  });
}

export function useTrucks() {
  return useQuery<Truck[]>({
    queryKey: ["trucks"],
    queryFn: trucksApi.list,
  });
}

export function useTruck(id: string) {
  return useQuery<Truck>({
    queryKey: ["truck", id],
    queryFn: () => trucksApi.get(id),
    enabled: !!id,
  });
}

export function useCreateTruck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: trucksApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trucks"] });
    },
  });
}

export function useUpdateTruck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Truck> }) =>
      trucksApi.update(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["truck", id] });
      queryClient.invalidateQueries({ queryKey: ["trucks"] });
    },
  });
}

export function useDeleteTruck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: trucksApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trucks"] });
    },
  });
}