"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface DeviceCompassState {
  heading: number | null;
  isCompassAvailable: boolean;
  permissionGranted: boolean;
  requestPermission: () => Promise<boolean>;
}

/**
 * Tactical device orientation compass hook for mobile browsers.
 * Distinguishes device physical compass heading from GPS trajectory bearing.
 * Handles iOS 13+ permission requirements and Android absolute orientation.
 */
export function useDeviceCompass(): DeviceCompassState {
  const [heading, setHeading] = useState<number | null>(null);
  const [isCompassAvailable, setIsCompassAvailable] = useState<boolean>(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);

  const lastHeadingRef = useRef<number | null>(null);
  const isListeningRef = useRef<boolean>(false);

  // Normalize angle strictly to [0, 360)
  const normalizeAngle = useCallback((deg: number): number => {
    const normalized = deg % 360;
    return normalized < 0 ? normalized + 360 : normalized;
  }, []);

  const handleOrientation = useCallback(
    (event: DeviceOrientationEvent) => {
      let rawHeading: number | null = null;

      // 1. iOS: webkitCompassHeading provides true north bearing (0-360)
      const iosEvent = event as DeviceOrientationEvent & {
        webkitCompassHeading?: number;
      };
      if (typeof iosEvent.webkitCompassHeading === "number" && !isNaN(iosEvent.webkitCompassHeading)) {
        rawHeading = iosEvent.webkitCompassHeading;
      }
      // 2. Android: alpha represents rotation around z-axis when absolute is available
      else if (typeof event.alpha === "number" && !isNaN(event.alpha)) {
        // In standard W3C spec, 0 is North, rotation is counter-clockwise -> invert
        rawHeading = 360 - event.alpha;
      }

      if (rawHeading !== null) {
        const normalized = Math.round(normalizeAngle(rawHeading));

        // Threshold check: ignore micro-jitter (< 1.5 degrees)
        if (
          lastHeadingRef.current === null ||
          Math.abs(normalized - lastHeadingRef.current) >= 1.5
        ) {
          lastHeadingRef.current = normalized;
          setHeading(normalized);
          setIsCompassAvailable(true);
        }
      }
    },
    [normalizeAngle]
  );

  const startListening = useCallback(() => {
    if (typeof window === "undefined" || isListeningRef.current) return;

    const hasAbsolute = typeof (window as unknown as Record<string, unknown>).ondeviceorientationabsolute !== "undefined";

    // Use absolute orientation when supported (Android Chrome)
    if (hasAbsolute) {
      window.addEventListener(
        "deviceorientationabsolute" as unknown as "deviceorientation",
        handleOrientation,
        true
      );
    } else {
      window.addEventListener("deviceorientation", handleOrientation, true);
    }

    isListeningRef.current = true;
    setPermissionGranted(true);
  }, [handleOrientation]);

  // Request Permission (Required for iOS 13+ Mobile Safari)
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined") return false;

    try {
      const maybeDeviceOrientation = DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<"granted" | "denied">;
      };

      if (typeof maybeDeviceOrientation.requestPermission === "function") {
        const response = await maybeDeviceOrientation.requestPermission();
        if (response === "granted") {
          startListening();
          return true;
        } else {
          setPermissionGranted(false);
          setIsCompassAvailable(false);
          return false;
        }
      } else {
        // Standard Android / non-iOS permission model
        startListening();
        return true;
      }
    } catch (err) {
      console.warn("Compass permission request failed:", err);
      return false;
    }
  }, [startListening]);

  // Auto-start for devices that don't require explicit touch permission
  useEffect(() => {
    if (typeof window === "undefined") return;

    const maybeDeviceOrientation = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };

    // If device doesn't require explicit permission prompt (e.g. Android), start immediately
    if (typeof maybeDeviceOrientation?.requestPermission !== "function") {
      startListening();
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("deviceorientation", handleOrientation, true);
        window.removeEventListener(
          "deviceorientationabsolute" as unknown as "deviceorientation",
          handleOrientation,
          true
        );
      }
      isListeningRef.current = false;
    };
  }, [handleOrientation, startListening]);

  return {
    heading,
    isCompassAvailable,
    permissionGranted,
    requestPermission,
  };
}
