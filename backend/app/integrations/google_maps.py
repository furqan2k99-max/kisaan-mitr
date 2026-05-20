import logging
import httpx
from typing import List, Dict, Any, Optional, Tuple
from math import radians, sin, cos, sqrt, atan2

from app.core.config import settings

logger = logging.getLogger(__name__)


class GoogleMapsClient:
    """
    Google Maps API Wrapper for geospatial routing and distance matrices
    """

    def __init__(self):
        self.api_key = settings.GOOGLE_MAPS_API_KEY
        self.base_url = settings.GOOGLE_MAPS_API_URL
        self.stub_mode = not bool(self.api_key)
        if self.stub_mode:
            logger.info("Google Maps running in STUB mode — using Haversine fallback")

    def _calculate_haversine(
        self,
        lat1: float, lon1: float,
        lat2: float, lon2: float
    ) -> float:
        """Calculate distance between two points in km using Haversine formula"""
        R = 6371

        lat1_rad, lat2_rad = radians(lat1), radians(lat2)
        delta_lat = radians(lat2 - lat1)
        delta_lon = radians(lon2 - lon1)

        a = sin(delta_lat / 2) ** 2 + cos(lat1_rad) * cos(lat2_rad) * sin(delta_lon / 2) ** 2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))

        return R * c

    async def get_distance_matrix(
        self,
        origins: List[Tuple[float, float]],
        destinations: List[Tuple[float, float]],
        mode: str = "driving"
    ) -> Optional[Dict[str, Any]]:
        """
        Get distance matrix between multiple origins and destinations

        Args:
            origins: List of (lat, lon) tuples
            destinations: List of (lat, lon) tuples
            mode: Travel mode (driving, walking, bicycling)

        Returns:
            Dict with distances and durations
        """
        if not self.api_key:
            logger.warning("Google Maps API key not configured, using fallback")
            return self._fallback_distance_matrix(origins, destinations)

        try:
            origin_str = "|".join([f"{lat},{lon}" for lat, lon in origins])
            dest_str = "|".join([f"{lat},{lon}" for lat, lon in destinations])

            url = f"{self.base_url}/distancematrix/json"
            params = {
                "origins": origin_str,
                "destinations": dest_str,
                "mode": mode,
                "key": self.api_key
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, params=params)

                if response.status_code == 200:
                    data = response.json()
                    if data.get("status") == "OK":
                        logger.info("Google Maps distance matrix retrieved")
                        return self._parse_distance_matrix(data)
                    else:
                        logger.error(f"Google Maps API error: {data.get('status')}")
                        return None
                else:
                    logger.error(f"Google Maps HTTP error: {response.status_code}")
                    return None

        except Exception as e:
            logger.error(f"Google Maps distance matrix error: {e}")
            return self._fallback_distance_matrix(origins, destinations)

    def _fallback_distance_matrix(
        self,
        origins: List[Tuple[float, float]],
        destinations: List[Tuple[float, float]]
    ) -> Dict[str, Any]:
        """Fallback using Haversine formula when API is unavailable"""
        matrix = []
        for lat1, lon1 in origins:
            row = []
            for lat2, lon2 in destinations:
                distance = self._calculate_haversine(lat1, lon1, lat2, lon2)
                row.append({
                    "distance_km": round(distance, 2),
                    "duration_minutes": int(distance * 2)
                })
            matrix.append(row)

        return {"matrix": matrix, "fallback": True}

    def _parse_distance_matrix(self, data: Dict) -> Dict[str, Any]:
        """Parse Google Maps API response"""
        rows = data.get("rows", [])
        matrix = []

        for row in rows:
            elements = row.get("elements", [])
            row_data = []
            for elem in elements:
                if elem.get("status") == "OK":
                    row_data.append({
                        "distance_km": elem.get("distance", {}).get("value", 0) / 1000,
                        "duration_minutes": elem.get("duration", {}).get("value", 0) / 60
                    })
                else:
                    row_data.append({"distance_km": 0, "duration_minutes": 0})
            matrix.append(row_data)

        return {"matrix": matrix, "fallback": False}

    async def get_directions(
        self,
        origin: Tuple[float, float],
        destination: Tuple[float, float],
        waypoints: List[Tuple[float, float]] = None,
        optimize: bool = True
    ) -> Optional[Dict[str, Any]]:
        """
        Get optimized route directions with optional waypoints

        Args:
            origin: (lat, lon) tuple
            destination: (lat, lon) tuple
            waypoints: List of (lat, lon) tuples for intermediate stops
            optimize: Whether to optimize waypoint order

        Returns:
            Dict with route polyline, distance, and duration
        """
        if not self.api_key:
            logger.warning("Google Maps API key not configured")
            return self._fallback_route(origin, destination, waypoints)

        try:
            origin_str = f"{origin[0]},{origin[1]}"
            dest_str = f"{destination[0]},{destination[1]}"

            params = {
                "origin": origin_str,
                "destination": dest_str,
                "mode": "driving",
                "key": self.api_key
            }

            if waypoints:
                waypoint_str = "|".join([f"{lat},{lon}" for lat, lon in waypoints])
                params["waypoints"] = waypoint_str
                if optimize:
                    params["waypoints"] = f"optimize:true|{waypoint_str}"

            url = f"{self.base_url}/directions/json"

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, params=params)

                if response.status_code == 200:
                    data = response.json()
                    if data.get("status") == "OK":
                        return self._parse_directions(data)
                    else:
                        logger.error(f"Google Directions API error: {data.get('status')}")
                        return None

        except Exception as e:
            logger.error(f"Google Directions error: {e}")
            return self._fallback_route(origin, destination, waypoints)

    def _parse_directions(self, data: Dict) -> Dict[str, Any]:
        """Parse Google Directions API response"""
        route = data["routes"][0]
        legs = route["legs"]

        total_distance = sum(leg["distance"]["value"] for leg in legs)
        total_duration = sum(leg["duration"]["value"] for leg in legs)

        return {
            "polyline": route["overview_polyline"]["points"],
            "distance_km": total_distance / 1000,
            "duration_minutes": total_duration / 60,
            "legs": [
                {
                    "distance_km": leg["distance"]["value"] / 1000,
                    "duration_minutes": leg["duration"]["value"] / 60,
                    "start_address": leg["start_address"],
                    "end_address": leg["end_address"]
                }
                for leg in legs
            ]
        }

    def _fallback_route(
        self,
        origin: Tuple[float, float],
        destination: Tuple[float, float],
        waypoints: List[Tuple[float, float]] = None
    ) -> Dict[str, Any]:
        """Fallback route calculation using Haversine"""
        points = [origin] + (waypoints or []) + [destination]
        total_distance = 0

        for i in range(len(points) - 1):
            total_distance += self._calculate_haversine(
                points[i][0], points[i][1],
                points[i + 1][0], points[i + 1][1]
            )

        return {
            "polyline": "",
            "distance_km": round(total_distance, 2),
            "duration_minutes": int(total_distance * 2),
            "fallback": True
        }

    async def reverse_geocode(
        self,
        lat: float,
        lon: float
    ) -> Optional[Dict[str, Any]]:
        """
        Convert coordinates to human-readable address

        Args:
            lat: Latitude
            lon: Longitude

        Returns:
            Dict with address components
        """
        if not self.api_key:
            return None

        try:
            url = f"{self.base_url}/geocode/json"
            params = {
                "latlng": f"{lat},{lon}",
                "key": self.api_key
            }

            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(url, params=params)

                if response.status_code == 200:
                    data = response.json()
                    if data.get("status") == "OK" and data.get("results"):
                        result = data["results"][0]
                        return {
                            "formatted_address": result.get("formatted_address"),
                            "components": result.get("address_components", [])
                        }

        except Exception as e:
            logger.error(f"Reverse geocode error: {e}")

        return None