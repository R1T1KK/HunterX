"use client";

import { useEffect, useRef, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import { getSocket } from "@/services/socketService";
import { Room, PlayerRole, PlayerLocation } from "@/types";
import { MultiplayerLerpEngine, RemotePlayerPacket } from "@/lib/MultiplayerLerpEngine";
import { registerMapTacticalIcons } from "@/components/map/mapIcons";

export const MULTIPLAYER_SOURCE_ID = "multiplayer-players-source";
export const MULTIPLAYER_HALO_LAYER_ID = "multiplayer-players-halo";
export const MULTIPLAYER_SYMBOL_LAYER_ID = "multiplayer-players-symbol";

interface UseMultiplayerMarkersOptions {
  map: mapboxgl.Map | null;
  room?: Room | null;
  currentPlayerId?: string;
}

export function useMultiplayerMarkers({
  map,
  room,
  currentPlayerId,
}: UseMultiplayerMarkersOptions) {
  const engineRef = useRef<MultiplayerLerpEngine>(new MultiplayerLerpEngine());
  const animFrameIdRef = useRef<number | null>(null);
  const isLayersConfiguredRef = useRef<boolean>(false);

  // Setup Mapbox GeoJSON Source & Layers
  const setupLayers = useCallback((mapInstance: mapboxgl.Map) => {
    try {
      if (mapInstance.getSource(MULTIPLAYER_SOURCE_ID)) {
        isLayersConfiguredRef.current = true;
        return;
      }

      // 1. Register custom tactical canvas icons
      registerMapTacticalIcons(mapInstance);

      // 2. Add FeatureCollection GeoJSON Source
      mapInstance.addSource(MULTIPLAYER_SOURCE_ID, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });

      // 3. Layer 1: Player Aura / Tactical Halo
      mapInstance.addLayer({
        id: MULTIPLAYER_HALO_LAYER_ID,
        type: "circle",
        source: MULTIPLAYER_SOURCE_ID,
        paint: {
          "circle-radius": 18,
          "circle-color": [
            "case",
            ["==", ["get", "role"], "HUNTER"],
            "#FF3B30",
            "#00F0FF",
          ],
          "circle-opacity": 0.22,
          "circle-blur": 0.4,
        },
      });

      // 4. Layer 2: Player Symbol with Directional Heading & Callsign Label
      mapInstance.addLayer({
        id: MULTIPLAYER_SYMBOL_LAYER_ID,
        type: "symbol",
        source: MULTIPLAYER_SOURCE_ID,
        layout: {
          "icon-image": [
            "case",
            ["==", ["get", "role"], "HUNTER"],
            "hunter-marker",
            "runner-marker",
          ],
          "icon-size": 0.85,
          "icon-rotate": ["get", "heading"],
          "icon-rotation-alignment": "map",
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
          "text-field": ["get", "callsign"],
          "text-size": 11,
          "text-anchor": "top",
          "text-offset": [0, 1.25],
          "text-allow-overlap": true,
          "text-ignore-placement": true,
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
        },
        paint: {
          "text-color": "#FFFFFF",
          "text-halo-color": "#07090E",
          "text-halo-width": 2,
        },
      });

      isLayersConfiguredRef.current = true;
    } catch (err) {
      console.warn("⚠️ [MultiplayerMarkers] Could not set up Mapbox layers:", err);
    }
  }, []);

  // 60 FPS RequestAnimationFrame Animation Loop
  useEffect(() => {
    if (!map) return;

    setupLayers(map);

    let isRunning = true;

    const renderLoop = (time: number) => {
      if (!isRunning) return;

      try {
        const source = map.getSource(MULTIPLAYER_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
        if (source && isLayersConfiguredRef.current) {
          const featureCollection = engineRef.current.step(time);
          source.setData(featureCollection);
        }
      } catch {
        // Map may be tearing down or style reloading
      }

      animFrameIdRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameIdRef.current = requestAnimationFrame(renderLoop);

    return () => {
      isRunning = false;
      if (animFrameIdRef.current !== null) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
    };
  }, [map, setupLayers]);

  // Handle Socket.IO multiplayer location updates
  useEffect(() => {
    const socket = getSocket();

    // 1. Single Player Location Update
    const handlePlayerUpdated = (data: {
      playerId: string;
      location: PlayerLocation;
      role?: PlayerRole;
      callsign?: string;
    }) => {
      // Do not render duplicate marker for the local user (handled by primary DOM marker)
      if (data.playerId === currentPlayerId) return;

      // Determine callsign and role from room state if not in packet
      const playerInRoom = room?.players.find((p) => p.playerId === data.playerId);
      const callsign = data.callsign || playerInRoom?.callsign || `Player_${data.playerId.slice(-4)}`;
      const role: PlayerRole = data.role || playerInRoom?.role || "RUNNER";

      const packet: RemotePlayerPacket = {
        playerId: data.playerId,
        callsign,
        role,
        lng: data.location.lng,
        lat: data.location.lat,
        heading: data.location.heading,
        speed: data.location.speed,
        timestamp: data.location.timestamp || Date.now(),
      };

      engineRef.current.ingestPacket(packet);
    };

    // 2. Authoritative 1-second multi-player tick (Day 8 compatibility)
    const handleGameTick = (data: {
      hunters?: Array<{ userId: string; lat: number; lng: number; heading?: number }>;
      hiders?: Array<{ userId: string; lat: number; lng: number; heading?: number }>;
    }) => {
      const now = Date.now();

      if (Array.isArray(data.hunters)) {
        for (const h of data.hunters) {
          if (h.userId === currentPlayerId) continue;
          const p = room?.players.find((player) => player.playerId === h.userId);
          engineRef.current.ingestPacket({
            playerId: h.userId,
            callsign: p?.callsign || "Hunter",
            role: "HUNTER",
            lat: h.lat,
            lng: h.lng,
            heading: h.heading ?? 0,
            timestamp: now,
          });
        }
      }

      if (Array.isArray(data.hiders)) {
        for (const h of data.hiders) {
          if (h.userId === currentPlayerId) continue;
          const p = room?.players.find((player) => player.playerId === h.userId);
          engineRef.current.ingestPacket({
            playerId: h.userId,
            callsign: p?.callsign || "Runner",
            role: "RUNNER",
            lat: h.lat,
            lng: h.lng,
            heading: h.heading ?? 0,
            timestamp: now,
          });
        }
      }
    };

    // 3. Player Disconnected or Left Room
    const handlePlayerLeft = (data: { playerId: string }) => {
      engineRef.current.removePlayer(data.playerId);
    };

    socket.on("location:player-updated", handlePlayerUpdated);
    socket.on("game:tick", handleGameTick);
    socket.on("room:player-left", handlePlayerLeft);

    return () => {
      socket.off("location:player-updated", handlePlayerUpdated);
      socket.off("game:tick", handleGameTick);
      socket.off("room:player-left", handlePlayerLeft);
    };
  }, [currentPlayerId, room]);

  // Clean engine on room change or unmount
  useEffect(() => {
    const engine = engineRef.current;
    return () => {
      engine.clear();
    };
  }, [room?.roomCode]);

  return {
    engine: engineRef.current,
  };
}
