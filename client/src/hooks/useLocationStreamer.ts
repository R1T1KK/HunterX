"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getSocket } from "@/services/socketService";
import { GeolocationCoords, LocationUpdatePayload, SmoothedCoordinate } from "@/types";
import { GpsSmoother, GpsFilterResult } from "@/lib/GpsSmoother";

export interface UseLocationStreamerOptions {
  roomCode?: string | null;
  playerId?: string | null;
  rawCoords?: GeolocationCoords | null;
  enabled?: boolean;
  alpha?: number;
  throttleMs?: number;
}

export function useLocationStreamer({
  roomCode,
  playerId,
  rawCoords,
  enabled = true,
  alpha = 0.25,
  throttleMs = 1000,
}: UseLocationStreamerOptions): {
  smoothedCoords: SmoothedCoordinate | null;
  lastFilterResult: GpsFilterResult | null;
  emitCount: number;
  resetFilter: () => void;
} {
  const [smoothedCoords, setSmoothedCoords] = useState<SmoothedCoordinate | null>(null);
  const [lastFilterResult, setLastFilterResult] = useState<GpsFilterResult | null>(null);
  const [emitCount, setEmitCount] = useState<number>(0);

  const smootherRef = useRef<GpsSmoother>(new GpsSmoother({ alpha, maxAllowedAccuracyMeters: 25.0 }));
  const lastEmitTimeRef = useRef<number>(0);
  const pendingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const latestPayloadRef = useRef<LocationUpdatePayload | null>(null);

  // Update alpha if changed
  useEffect(() => {
    smootherRef.current.setAlpha(alpha);
  }, [alpha]);

  // Reset filter when room or player changes
  const resetFilter = useCallback(() => {
    smootherRef.current.reset();
    setSmoothedCoords(null);
    setLastFilterResult(null);
    lastEmitTimeRef.current = 0;
    if (pendingTimerRef.current) {
      clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    resetFilter();
  }, [roomCode, playerId, resetFilter]);

  // Safe Socket Emit Function with 1.5 KB payload guard
  const dispatchPayload = useCallback((payload: LocationUpdatePayload) => {
    try {
      const payloadStr = JSON.stringify(payload);
      // Strict 1536B constraint check
      if (payloadStr.length > 1536) {
        console.warn("⚠️ [LocationStreamer] Payload exceeds 1.5 KB limit:", payloadStr.length);
        return;
      }

      const socket = getSocket();
      if (socket && socket.connected) {
        socket.emit("location:update", payload);
        lastEmitTimeRef.current = Date.now();
        setEmitCount((c) => c + 1);
      }
    } catch (err) {
      console.warn("⚠️ [LocationStreamer] Failed to emit location:update:", err);
    }
  }, []);

  // Process incoming raw GPS coordinates
  useEffect(() => {
    if (!rawCoords) return;

    const filterResult = smootherRef.current.process({
      lat: rawCoords.lat,
      lng: rawCoords.lng,
      accuracy: rawCoords.accuracy,
      heading: rawCoords.heading,
      speed: rawCoords.speed,
      timestamp: rawCoords.timestamp,
    });

    setLastFilterResult(filterResult);

    // If accepted, update smoothed coordinates state
    if (filterResult.accepted) {
      const newSmoothed: SmoothedCoordinate = {
        lat: filterResult.smoothedLat,
        lng: filterResult.smoothedLng,
        accuracy: filterResult.accuracy,
        heading: filterResult.heading,
        speed: filterResult.speed,
        timestamp: filterResult.timestamp,
        distanceDeltaMeters: filterResult.distanceDeltaMeters,
        isSmoothed: filterResult.isSmoothed,
      };

      setSmoothedCoords(newSmoothed);

      // Throttled 1 Hz Socket.IO streaming
      if (enabled && roomCode && playerId) {
        const payload: LocationUpdatePayload = {
          roomCode,
          playerId,
          lat: Number(filterResult.smoothedLat.toFixed(6)),
          lng: Number(filterResult.smoothedLng.toFixed(6)),
          accuracy: Number(filterResult.accuracy.toFixed(1)),
          heading: filterResult.heading !== null ? Number(filterResult.heading.toFixed(1)) : null,
          speed: filterResult.speed !== null ? Number(filterResult.speed.toFixed(1)) : null,
          timestamp: filterResult.timestamp,
        };

        latestPayloadRef.current = payload;

        const now = Date.now();
        const elapsedSinceLastEmit = now - lastEmitTimeRef.current;

        if (elapsedSinceLastEmit >= throttleMs) {
          // Send immediately if at least 1 second has elapsed
          if (pendingTimerRef.current) {
            clearTimeout(pendingTimerRef.current);
            pendingTimerRef.current = null;
          }
          dispatchPayload(payload);
        } else if (!pendingTimerRef.current) {
          // Schedule trailing emit to guarantee latest position is delivered
          const waitTime = Math.max(50, throttleMs - elapsedSinceLastEmit);
          pendingTimerRef.current = setTimeout(() => {
            pendingTimerRef.current = null;
            if (latestPayloadRef.current) {
              dispatchPayload(latestPayloadRef.current);
            }
          }, waitTime);
        }
      }
    }
  }, [rawCoords, enabled, roomCode, playerId, throttleMs, dispatchPayload]);

  // Handle Socket Reconnection: stream latest known position immediately
  useEffect(() => {
    const socket = getSocket();

    const handleConnect = () => {
      if (latestPayloadRef.current && roomCode && playerId) {
        console.log("🔌 [LocationStreamer] Socket reconnected, sending latest location snapshot...");
        dispatchPayload(latestPayloadRef.current);
      }
    };

    socket.on("connect", handleConnect);

    return () => {
      socket.off("connect", handleConnect);
    };
  }, [roomCode, playerId, dispatchPayload]);

  // Cleanup pending timer on unmount
  useEffect(() => {
    return () => {
      if (pendingTimerRef.current) {
        clearTimeout(pendingTimerRef.current);
        pendingTimerRef.current = null;
      }
    };
  }, []);

  return {
    smoothedCoords,
    lastFilterResult,
    emitCount,
    resetFilter,
  };
}

