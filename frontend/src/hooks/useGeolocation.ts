"use client";

import { useState, useCallback } from "react";

interface LocationCoords {
  lat: number;
  lng: number;
}

interface UseGeolocationReturn {
  location: LocationCoords | null;
  address: string | null;
  loading: boolean;
  error: string | null;
  getLocation: () => void;
}

export function useGeolocation(): UseGeolocationReturn {
  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<string | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        {
          headers: {
            "User-Agent": "KisaanMitr/1.0 (Agritech Platform)",
          },
        }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      
      if (data.address) {
        const parts = [];
        if (data.address.village || data.address.town || data.address.city) {
          parts.push(data.address.village || data.address.town || data.address.city);
        }
        if (data.address.district) {
          parts.push(data.address.district);
        }
        if (data.address.state) {
          parts.push(data.address.state);
        }
        if (parts.length > 0) {
          return parts.join(", ");
        }
        return data.display_name?.split(",").slice(0, 2).join(",");
      }
      
      return data.display_name?.split(",").slice(0, 2).join(",") || null;
    } catch (e) {
      console.error("Geocoding error:", e);
      return null;
    }
  }, []);

  const getLocation = useCallback(() => {
    if (typeof window === "undefined") {
      setError("Geolocation not available");
      return;
    }

    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const loc = { lat: latitude, lng: longitude };
        setLocation(loc);

        const addr = await reverseGeocode(latitude, longitude);
        setAddress(addr);
        setLoading(false);
      },
      (err) => {
        let message = "Could not detect location";
        switch (err.code) {
          case err.PERMISSION_DENIED:
            message = "Location permission denied";
            break;
          case err.POSITION_UNAVAILABLE:
            message = "Location unavailable";
            break;
          case err.TIMEOUT:
            message = "Location request timed out";
            break;
        }
        setError(message);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  }, [reverseGeocode]);

  return { location, address, loading, error, getLocation };
}