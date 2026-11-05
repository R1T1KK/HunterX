"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { Map as MapboxMap } from "mapbox-gl";
import { Crosshair, Compass, Plus, Minus, Loader2, AlertCircle } from "lucide-react";

interface FloatingMapControlsProps {
  map: MapboxMap | null;
  onGpsError?: (message: string) => void;
}

export function FloatingMapControls({ map, onGpsError }: FloatingMapControlsProps) {
  const [bearing, setBearing] = useState<number>(0);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync compass rotation with map bearing
  useEffect(() => {
    if (!map) return;

    const updateBearing = () => {
      setBearing(Math.round(map.getBearing()));
    };

    map.on("rotate", updateBearing);
    map.on("pitchend", updateBearing);

    return () => {
      map.off("rotate", updateBearing);
      map.off("pitchend", updateBearing);
    };
  }, [map]);

  // Recenter on device GPS coordinates
  const handleRecenter = useCallback(() => {
    if (!map) return;

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      const msg = "Geolocation is not supported on this device";
      setErrorMessage(msg);
      onGpsError?.(msg);
      return;
    }

    setIsLocating(true);
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { longitude, latitude } = pos.coords;

        map.flyTo({
          center: [longitude, latitude],
          zoom: 16,
          pitch: 25,
          duration: 1200,
          essential: true,
        });
      },
      (err) => {
        setIsLocating(false);
        let msg = "Unable to retrieve device location";
        if (err.code === err.PERMISSION_DENIED) {
          msg = "Location permission was denied. Please allow GPS access in settings.";
        } else if (err.code === err.TIMEOUT) {
          msg = "GPS location request timed out.";
        }
        setErrorMessage(msg);
        onGpsError?.(msg);
        setTimeout(() => setErrorMessage(null), 4000);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [map, onGpsError]);

  // Reset orientation to North
  const handleResetNorth = useCallback(() => {
    if (!map) return;
    map.easeTo({
      bearing: 0,
      pitch: 0,
      duration: 500,
      essential: true,
    });
  }, [map]);

  // Zoom In
  const handleZoomIn = useCallback(() => {
    if (!map) return;
    map.zoomIn({ duration: 300 });
  }, [map]);

  // Zoom Out
  const handleZoomOut = useCallback(() => {
    if (!map) return;
    map.zoomOut({ duration: 300 });
  }, [map]);

  return (
    <>
      {/* Ephemeral Error Toast */}
      {errorMessage && (
        <aside aria-label="Error alert" className="fixed top-16 left-4 right-4 z-40 mx-auto max-w-sm p-3 rounded-2xl bg-game-card/95 border border-game-crimson/50 text-white flex items-center gap-2.5 text-xs shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
          <AlertCircle className="w-4 h-4 text-game-crimson shrink-0" />
          <span className="font-semibold text-game-text-muted">{errorMessage}</span>
        </aside>
      )}

      {/* Floating Tactical Controls - Thumb-Zone Stacked on Right */}
      <aside aria-label="Map controls" className="fixed right-3 bottom-24 z-30 flex flex-col items-center gap-2.5 select-none safe-right">
        {/* 1. Compass Bearing & Reset North */}
        <button
          type="button"
          onClick={handleResetNorth}
          title="Reset map orientation to North"
          aria-label="Reset map orientation to North"
          className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-2xl bg-game-charcoal/90 border border-game-border hover:border-neutral-600 active:scale-95 text-white flex items-center justify-center shadow-lg backdrop-blur-md transition-all cursor-pointer group"
        >
          <div
            className="transition-transform duration-150 ease-out"
            style={{ transform: `rotate(${-bearing}deg)` }}
          >
            <Compass className="w-5 h-5 text-game-crimson group-hover:text-white" />
          </div>
        </button>

        {/* 2. Recenter On Me */}
        <button
          type="button"
          onClick={handleRecenter}
          disabled={isLocating}
          title="Recenter map on my location"
          aria-label="Recenter map on my location"
          className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-2xl bg-game-charcoal/90 border border-game-border hover:border-game-crimson active:scale-95 text-white flex items-center justify-center shadow-lg backdrop-blur-md transition-all cursor-pointer ${
            isLocating ? "opacity-75" : ""
          }`}
        >
          {isLocating ? (
            <Loader2 className="w-5 h-5 text-game-amber animate-spin" />
          ) : (
            <Crosshair className="w-5 h-5 text-white hover:text-game-crimson" />
          )}
        </button>

        {/* 3. Zoom Controls Stack */}
        <div className="flex flex-col bg-game-charcoal/90 border border-game-border rounded-2xl overflow-hidden shadow-lg backdrop-blur-md">
          {/* Zoom In */}
          <button
            type="button"
            onClick={handleZoomIn}
            title="Zoom In"
            aria-label="Zoom In"
            className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer border-b border-game-border/60"
          >
            <Plus className="w-5 h-5" />
          </button>

          {/* Zoom Out */}
          <button
            type="button"
            onClick={handleZoomOut}
            title="Zoom Out"
            aria-label="Zoom Out"
            className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
          >
            <Minus className="w-5 h-5" />
          </button>
        </div>
      </aside>
    </>
  );
}
