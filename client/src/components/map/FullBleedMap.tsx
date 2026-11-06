"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import { getMapboxToken, isMapboxTokenValid, MAP_CONFIG, FALLBACK_TACTICAL_STYLE } from "./mapConfig";
import { FloatingMapControls } from "./FloatingMapControls";
import { createGeoJsonCircle } from "@/lib/geoUtils";
import { AlertTriangle, KeyRound, Radio } from "lucide-react";

interface FullBleedMapProps {
  initialCenter?: [number, number];
  initialZoom?: number;
  onMapLoaded?: (map: mapboxgl.Map) => void;
  userCoordinates?: [number, number] | null;
  accuracy?: number | null;
  heading?: number | null;
  className?: string;
  children?: React.ReactNode;
}

export function FullBleedMap({
  initialCenter = MAP_CONFIG.defaultCenter,
  initialZoom = MAP_CONFIG.defaultZoom,
  onMapLoaded,
  userCoordinates,
  accuracy,
  heading,
  className = "",
  children,
}: FullBleedMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const markerHeadingRef = useRef<HTMLDivElement | null>(null);
  const markerDotRef = useRef<HTMLDivElement | null>(null);

  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [tokenMissing, setTokenMissing] = useState<boolean>(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Helper to attach accuracy circle layers to Mapbox style
  const setupAccuracyLayers = useCallback((mapInstance: mapboxgl.Map) => {
    try {
      if (!mapInstance.getSource("user-accuracy-source")) {
        mapInstance.addSource("user-accuracy-source", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [],
          },
        });

        // Layer 0.1: Accuracy Circle Fill
        mapInstance.addLayer({
          id: "user-accuracy-fill",
          type: "fill",
          source: "user-accuracy-source",
          paint: {
            "fill-color": [
              "case",
              ["<", ["get", "radius"], 10],
              "#10B981", // Emerald (Excellent < 10m)
              ["<=", ["get", "radius"], 20],
              "#FF9500", // Amber (Moderate 10-20m)
              "#FF3B30", // Crimson (Weak > 20m)
            ],
            "fill-opacity": 0.18,
          },
        });

        // Layer 0.2: Accuracy Circle Metric Boundary Stroke
        mapInstance.addLayer({
          id: "user-accuracy-line",
          type: "line",
          source: "user-accuracy-source",
          paint: {
            "line-color": [
              "case",
              ["<", ["get", "radius"], 10],
              "#10B981",
              ["<=", ["get", "radius"], 20],
              "#FF9500",
              "#FF3B30",
            ],
            "line-width": 1.5,
            "line-opacity": 0.65,
            "line-dasharray": [2, 2],
          },
        });
      }
    } catch (err) {
      console.warn("Unable to configure accuracy circle layers on map:", err);
    }
  }, []);

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
        setupAccuracyLayers(mapInstance);

        // Customize Mapbox style layers dynamically on load if vector style
        try {
          if (mapInstance.getLayer("background")) {
            mapInstance.setPaintProperty("background", "background-color", "#07090E");
          }
        } catch {
          // Style may have custom layer names
        }
      });

      mapInstance.on("style.load", () => {
        setupAccuracyLayers(mapInstance);
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
  }, [initialCenter, initialZoom, onMapLoaded, setupAccuracyLayers]);

  // Synchronize Dynamic GPS Accuracy Circle in Real Time
  useEffect(() => {
    if (!map || !userCoordinates) return;

    try {
      const source = map.getSource("user-accuracy-source") as mapboxgl.GeoJSONSource | undefined;
      if (!source) return;

      if (accuracy && accuracy > 0) {
        const circleFeature = createGeoJsonCircle(userCoordinates, accuracy);
        source.setData(circleFeature);
      } else {
        source.setData({
          type: "FeatureCollection",
          features: [],
        });
      }
    } catch (err) {
      console.warn("Failed to update accuracy circle data:", err);
    }
  }, [map, userCoordinates, accuracy]);

  // Synchronize User Location Marker & Heading Pointer
  useEffect(() => {
    if (!map || !userCoordinates) return;

    const colorHex =
      accuracy && accuracy < 10
        ? "#10B981"
        : accuracy && accuracy <= 20
        ? "#FF9500"
        : "#FF3B30";

    if (!userMarkerRef.current) {
      // Create tactical pulsating marker element
      const el = document.createElement("div");
      el.className = "relative flex items-center justify-center w-10 h-10 pointer-events-none";

      const headingCone = document.createElement("div");
      headingCone.className =
        "absolute -top-3 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[10px] border-b-game-crimson transition-transform duration-150 ease-out";
      headingCone.style.transformOrigin = "center 26px";
      markerHeadingRef.current = headingCone;

      const pulseRing = document.createElement("div");
      pulseRing.className = "absolute w-9 h-9 rounded-full opacity-40 animate-ping";
      pulseRing.style.backgroundColor = colorHex;

      const halo = document.createElement("div");
      halo.className = "absolute w-7 h-7 rounded-full border shadow-lg transition-colors duration-200";
      halo.style.backgroundColor = `${colorHex}33`;
      halo.style.borderColor = `${colorHex}99`;
      halo.style.boxShadow = `0 0 14px ${colorHex}`;

      const centerDot = document.createElement("div");
      centerDot.className = "w-3.5 h-3.5 rounded-full bg-white shadow-md z-10 transition-colors duration-200";
      markerDotRef.current = centerDot;

      el.appendChild(headingCone);
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

    // Update heading rotation if available
    if (markerHeadingRef.current) {
      if (heading !== null && heading !== undefined) {
        markerHeadingRef.current.style.display = "block";
        markerHeadingRef.current.style.transform = `rotate(${heading}deg)`;
      } else {
        markerHeadingRef.current.style.display = "none";
      }
    }
  }, [map, userCoordinates, accuracy, heading]);

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

