"use client";

import { useState, useEffect, useRef } from "react";
import { GPSStatus } from "@/types";

interface GeolocationState {
  status: GPSStatus;
  coords: {
    lat: number;
    lng: number;
    accuracy: number;
  } | null;
  errorMessage: string | null;
}

export function useGeolocation(
  onStatusChange?: (status: GPSStatus) => void
): GeolocationState {
  const [state, setState] = useState<GeolocationState>({
    status: "ACQUIRING",
    coords: null,
    errorMessage: null,
  });

  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;

  useEffect(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setState({
        status: "UNAVAILABLE",
        coords: null,
        errorMessage: "Geolocation API is not supported on this device/browser.",
      });
      onStatusChangeRef.current?.("UNAVAILABLE");
      return;
    }

    const handleSuccess = (position: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = position.coords;

      // Real GPS lock: accuracy must be reliable (<= 35m in outdoor conditions)
      const isLocked = accuracy <= 35;
      const newStatus: GPSStatus = isLocked ? "LOCKED" : "ACQUIRING";

      setState({
        status: newStatus,
        coords: { lat: latitude, lng: longitude, accuracy },
        errorMessage: null,
      });

      onStatusChangeRef.current?.(newStatus);
    };

    const handleError = (error: GeolocationPositionError) => {
      let newStatus: GPSStatus = "UNAVAILABLE";
      let msg = "Unable to retrieve device location.";

      if (error.code === error.PERMISSION_DENIED) {
        newStatus = "DENIED";
        msg = "Location permission denied. Please allow GPS access in browser settings.";
      } else if (error.code === error.TIMEOUT) {
        newStatus = "ACQUIRING";
        msg = "GPS signal acquisition timed out. Retrying...";
      }

      setState({
        status: newStatus,
        coords: null,
        errorMessage: msg,
      });

      onStatusChangeRef.current?.(newStatus);
    };

    const watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 2000,
    });

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  return state;
}
