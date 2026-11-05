"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import { getMapboxToken, isMapboxTokenValid, MAP_CONFIG, FALLBACK_TACTICAL_STYLE } from "./mapConfig";
import { FloatingMapControls } from "./FloatingMapControls";
import { AlertTriangle, KeyRound, Radio } from "lucide-react";

interface FullBleedMapProps {
  initialCenter?: [number, number];
  initialZoom?: number;
  onMapLoaded?: (map: mapboxgl.Map) => void;
  userCoordinates?: [number, number] | null;
  className?: string;
  children?: React.ReactNode;
}

export function FullBleedMap({
  initialCenter = MAP_CONFIG.defaultCenter,
  initialZoom = MAP_CONFIG.defaultZoom,
  onMapLoaded,
  userCoordinates,
  className = "",
  children,
}: FullBleedMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);

  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [tokenMissing, setTokenMissing] = useState<boolean>(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Initialize Mapbox Canvas
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // Prevent duplicate instances on React re-renders

    const token = getMapboxToken();
    const hasValidToken = isMapboxTokenValid(token);

    if (!hasValidToken) {
      setTokenMissing(true);
    } else {
      mapboxgl.accessToken = token;
    }

    try {
      const mapInstance = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: hasValidToken ? MAP_CONFIG.defaultStyle : (FALLBACK_TACTICAL_STYLE as unknown as string),
        center: initialCenter,
        zoom: initialZoom,
        minZoom: MAP_CONFIG.minZoom,
        maxZoom: MAP_CONFIG.maxZoom,
        maxPitch: MAP_CONFIG.maxPitch,
        attributionControl: false, // Clean gaming viewport
        // Mobile-Specific Gesture Configurations
        dragPan: true, // Single-finger panning ENABLED
        touchZoomRotate: true, // Pinch-to-zoom ENABLED
        doubleClickZoom: false, // Double-tap zoom strictly DISABLED for gaming
        scrollZoom: false, // Disabled to prevent erratic desktop scrolling
        boxZoom: false, // Disabled for touch devices
        dragRotate: true,
      });

      // Add minimal, non-intrusive attribution to bottom right
      mapInstance.addControl(
        new mapboxgl.AttributionControl({ compact: true }),
        "bottom-right"
      );

      mapInstance.on("load", () => {
        setIsLoaded(true);
        setMap(mapInstance);
        mapInstanceRef.current = mapInstance;
        onMapLoaded?.(mapInstance);

        // Customize Mapbox style layers dynamically on load if vector style
        try {
          if (mapInstance.getLayer("background")) {
            mapInstance.setPaintProperty("background", "background-color", "#07090E");
          }
        } catch {
          // Style may have custom layer names
        }
      });

      mapInstance.on("error", (e) => {
        // Filter out non-fatal 404/tile errors
        const errorMsg = e.error?.message || "";
        if (errorMsg.includes("Unauthorized") || errorMsg.includes("Forbidden") || errorMsg.includes("401")) {
          setMapError("Invalid Mapbox Access Token. Please verify NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN in .env.local.");
        }
      });

      // Resize observer to ensure full-bleed canvas across mobile browser address bar changes
      const handleResize = () => {
        mapInstance.resize();
      };
      window.addEventListener("resize", handleResize);
      window.addEventListener("orientationchange", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("orientationchange", handleResize);
        if (userMarkerRef.current) {
          userMarkerRef.current.remove();
        }
        mapInstance.remove();
        mapInstanceRef.current = null;
        setMap(null);
      };
    } catch (err: unknown) {
      console.error("Failed to initialize Mapbox GL:", err);
      setMapError((err as Error).message || "Map initialization failed");
    }
  }, [initialCenter, initialZoom, onMapLoaded]);

  // Synchronize User Location Marker
  useEffect(() => {
    if (!map || !userCoordinates) return;

    if (!userMarkerRef.current) {
      // Create tactical pulsating marker element
      const el = document.createElement("div");
      el.className = "relative flex items-center justify-center w-8 h-8 pointer-events-none";

      const pulseRing = document.createElement("div");
      pulseRing.className = "absolute w-8 h-8 rounded-full bg-game-crimson/30 animate-ping";

      const halo = document.createElement("div");
      halo.className = "absolute w-6 h-6 rounded-full bg-game-crimson/40 border border-game-crimson/60 shadow-[0_0_12px_rgba(255,59,48,0.8)]";

      const centerDot = document.createElement("div");
      centerDot.className = "w-3 h-3 rounded-full bg-white shadow-md z-10";

      el.appendChild(pulseRing);
      el.appendChild(halo);
      el.appendChild(centerDot);

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat(userCoordinates)
        .addTo(map);

      userMarkerRef.current = marker;
    } else {
      userMarkerRef.current.setLngLat(userCoordinates);
    }
  }, [map, userCoordinates]);

  return (
    <main
      className={`fixed inset-0 w-[100vw] h-[100dvh] overflow-hidden bg-game-black select-none z-0 ${className}`}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100dvh",
      }}
    >
      {/* Primary Mapbox GL Canvas Container */}
      <div
        ref={mapContainerRef}
        className="w-full h-full relative"
        style={{ width: "100%", height: "100%" }}
      />

      {/* Token Missing Warning Banner (Graceful Dark Gaming Fallback) */}
      {tokenMissing && (
        <aside aria-label="Configuration notice" className="absolute top-16 left-3 right-3 z-30 max-w-sm mx-auto p-4 rounded-3xl bg-game-charcoal/95 border border-game-amber/40 shadow-2xl backdrop-blur-md text-white space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-game-amber shrink-0" />
            <h4 className="text-xs font-black uppercase tracking-wider text-game-amber">
              Mapbox Token Needed
            </h4>
          </div>
          <p className="text-[11px] text-game-text-muted leading-relaxed">
            Add your public Mapbox access token to <code className="text-white bg-black/40 px-1 py-0.5 rounded font-mono">.env.local</code> as:
          </p>
          <div className="bg-black/60 p-2 rounded-xl text-[10px] font-mono text-emerald-400 select-all overflow-x-auto">
            NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.eyJ...
          </div>
          <p className="text-[10px] text-neutral-400">
            A free token is available at <span className="text-white underline">mapbox.com</span>. The full-bleed tactical radar grid remains active.
          </p>
        </aside>
      )}

      {/* Fatal Mapbox Error Toast */}
      {mapError && (
        <aside aria-label="Map error" className="absolute top-16 left-3 right-3 z-30 max-w-sm mx-auto p-3.5 rounded-2xl bg-game-crimson/20 border border-game-crimson/60 shadow-2xl backdrop-blur-md text-white flex items-center gap-2.5 text-xs">
          <AlertTriangle className="w-4 h-4 text-game-crimson shrink-0" />
          <span className="font-semibold text-game-text-muted">{mapError}</span>
        </aside>
      )}

      {/* Floating Tactical Map Controls */}
      <FloatingMapControls map={map} />

      {/* Optional Child Overlays (HUD, Radar Ping Bar, Comms) */}
      {children}
    </main>
  );
}
