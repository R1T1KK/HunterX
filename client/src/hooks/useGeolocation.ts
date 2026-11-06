"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { GPSStatus, GPSSignalQuality, GeolocationCoords, GeolocationState } from "@/types";
import { evaluateSignalQuality } from "@/lib/geoUtils";

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  signalLossThresholdMs?: number;
}

export function useGeolocation(
  onStatusChange?: (status: GPSStatus) => void,
  options?: UseGeolocationOptions
): GeolocationState & {
  retryLocation: () => void;
} {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 1000,
    signalLossThresholdMs = 18000,
  } = options || {};

  const [coords, setCoords] = useState<GeolocationCoords | null>(null);
  const [status, setStatus] = useState<GPSStatus>("ACQUIRING");
  const [quality, setQuality] = useState<GPSSignalQuality>("ACQUIRING");
  const [qualityLabel, setQualityLabel] = useState<string>("ACQUIRING GPS");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isHighAccuracy, setIsHighAccuracy] = useState<boolean>(enableHighAccuracy);
  const [isSignalLost, setIsSignalLost] = useState<boolean>(false);

  const watchIdRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;

  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackRetryTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Updates state and invokes listener when GPS status changes
  const updateGpsStatus = useCallback((newStatus: GPSStatus) => {
    setStatus(newStatus);
    onStatusChangeRef.current?.(newStatus);
  }, []);

  const clearExistingWatcher = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const startWatcher = useCallback(
    (useHighAccuracy: boolean) => {
      if (typeof window === "undefined" || !navigator.geolocation) {
        updateGpsStatus("UNAVAILABLE");
        setQuality("UNAVAILABLE");
        setQualityLabel("GPS UNAVAILABLE");
        setErrorMessage("HTML5 Geolocation is not supported by this browser.");
        return;
      }

      clearExistingWatcher();
      setIsHighAccuracy(useHighAccuracy);

      const handleSuccess = (position: GeolocationPosition) => {
        const {
          latitude,
          longitude,
          accuracy,
          altitude,
          altitudeAccuracy,
          heading,
          speed,
        } = position.coords;

        lastUpdateRef.current = Date.now();
        setIsSignalLost(false);
        setErrorMessage(null);

        const newCoords: GeolocationCoords = {
          lat: latitude,
          lng: longitude,
          accuracy,
          altitude,
          altitudeAccuracy,
          heading,
          speed,
          timestamp: position.timestamp,
        };
        setCoords(newCoords);

        // Day 5 criteria: confirmed GPS lock requires reasonable outdoor accuracy (<= 35m)
        const newStatus: GPSStatus = accuracy <= 35 ? "LOCKED" : "ACQUIRING";
        updateGpsStatus(newStatus);

        const evaluated = evaluateSignalQuality(accuracy, newStatus, false);
        setQuality(evaluated.quality);
        setQualityLabel(evaluated.label);
      };

      const handleError = (error: GeolocationPositionError) => {
        let newStatus: GPSStatus = "UNAVAILABLE";
        let msg = "Unable to retrieve device coordinates.";

        if (error.code === error.PERMISSION_DENIED) {
          newStatus = "DENIED";
          msg = "Location permission denied. Please allow GPS access in settings.";
          updateGpsStatus("DENIED");
          setCoords(null);
          const evaluated = evaluateSignalQuality(null, "DENIED", false);
          setQuality(evaluated.quality);
          setQualityLabel(evaluated.label);
          setErrorMessage(msg);
          return;
        }

        if (error.code === error.TIMEOUT) {
          msg = "GPS acquisition timed out.";

          // Fallback recovery: if high accuracy timed out, retry with standard accuracy
          if (useHighAccuracy) {
            console.warn("⚠️ [GPS] High-accuracy acquisition timed out. Initiating fallback recovery...");
            startWatcher(false);

            // Schedule a retry to restore high accuracy after 15 seconds
            if (fallbackRetryTimerRef.current) clearTimeout(fallbackRetryTimerRef.current);
            fallbackRetryTimerRef.current = setTimeout(() => {
              console.log("🔄 [GPS] Attempting to restore high-accuracy location tracking...");
              startWatcher(true);
            }, 15000);
            return;
          }
        }

        // Handle GPS Signal Loss when previously acquired
        if (coords !== null) {
          setIsSignalLost(true);
          const evaluated = evaluateSignalQuality(coords.accuracy, status, true);
          setQuality(evaluated.quality);
          setQualityLabel(evaluated.label);
        } else {
          updateGpsStatus("ACQUIRING");
          const evaluated = evaluateSignalQuality(null, "ACQUIRING", false);
          setQuality(evaluated.quality);
          setQualityLabel(evaluated.label);
        }

        setErrorMessage(msg);
      };

      try {
        const id = navigator.geolocation.watchPosition(handleSuccess, handleError, {
          enableHighAccuracy: useHighAccuracy,
          timeout,
          maximumAge,
        });
        watchIdRef.current = id;
      } catch (err: unknown) {
        console.error("Failed to start geolocation watch:", err);
        updateGpsStatus("UNAVAILABLE");
        setQuality("UNAVAILABLE");
        setQualityLabel("GPS UNAVAILABLE");
        setErrorMessage((err as Error).message);
      }
    },
    [clearExistingWatcher, maximumAge, timeout, updateGpsStatus, coords, status]
  );

  // Manual retry trigger for UI
  const retryLocation = useCallback(() => {
    lastUpdateRef.current = 0;
    setIsSignalLost(false);
    updateGpsStatus("ACQUIRING");
    startWatcher(true);
  }, [startWatcher, updateGpsStatus]);

  // Main lifecycle: start single GPS watcher on mount
  useEffect(() => {
    startWatcher(enableHighAccuracy);

    // Heartbeat monitor: detect temporary GPS signal loss (no updates for > signalLossThresholdMs)
    heartbeatTimerRef.current = setInterval(() => {
      if (lastUpdateRef.current > 0 && Date.now() - lastUpdateRef.current > signalLossThresholdMs) {
        setIsSignalLost(true);
        setQuality("SIGNAL_LOST");
        setQualityLabel("GPS SIGNAL LOST");
      }
    }, 4000);

    return () => {
      clearExistingWatcher();
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
      if (fallbackRetryTimerRef.current) clearTimeout(fallbackRetryTimerRef.current);
    };
  }, [enableHighAccuracy, clearExistingWatcher, signalLossThresholdMs, startWatcher]);

  return {
    status,
    quality,
    qualityLabel,
    coords,
    errorMessage,
    isHighAccuracy,
    retryLocation,
  };
}
