"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY_PLAYER_ID = "hiderush_player_id";
const STORAGE_KEY_CALLSIGN = "hiderush_callsign";

const CALLSIGN_REGEX = /^[a-zA-Z0-9_-]{3,16}$/;

export function usePlayerProfile() {
  const [playerId, setPlayerId] = useState<string>("");
  const [callsign, setCallsignState] = useState<string>("Ritik_Kashyap");
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Load or initialize Player ID
    let storedId = localStorage.getItem(STORAGE_KEY_PLAYER_ID);
    if (!storedId) {
      storedId = typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `player-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      localStorage.setItem(STORAGE_KEY_PLAYER_ID, storedId);
    }
    setPlayerId(storedId);

    // 2. Load or initialize Callsign
    const storedCallsign = localStorage.getItem(STORAGE_KEY_CALLSIGN);
    if (storedCallsign && CALLSIGN_REGEX.test(storedCallsign)) {
      setCallsignState(storedCallsign);
    } else {
      localStorage.setItem(STORAGE_KEY_CALLSIGN, "Ritik_Kashyap");
    }

    setIsLoaded(true);
  }, []);

  const updateCallsign = (newCallsign: string): boolean => {
    const trimmed = newCallsign.trim();

    if (trimmed.length < 3) {
      setError("Callsign must be at least 3 characters");
      return false;
    }

    if (trimmed.length > 16) {
      setError("Callsign cannot exceed 16 characters");
      return false;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      setError("Only letters, numbers, _ and - are allowed");
      return false;
    }

    setError(null);
    setCallsignState(trimmed);
    localStorage.setItem(STORAGE_KEY_CALLSIGN, trimmed);
    return true;
  };

  return {
    playerId,
    callsign,
    updateCallsign,
    isLoaded,
    error,
    setError,
  };
}

