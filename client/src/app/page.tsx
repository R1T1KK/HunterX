"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getSocket } from "@/services/socketService";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";
import { useGeolocation } from "@/hooks/useGeolocation";
import { Room, HouseRules, RoleSettings, SocketErrorPayload, GPSStatus } from "@/types";
import { HomeScreen } from "@/components/home/HomeScreen";
import { GameLobbyScreen } from "@/components/lobby/GameLobbyScreen";
import { GameMapScreen } from "@/components/map/GameMapScreen";
import { BottomNav, NavTab } from "@/components/navigation/BottomNav";
import { StatsView } from "@/components/views/StatsView";
import { RulesView } from "@/components/views/RulesView";
import { ProfileView } from "@/components/views/ProfileView";

function MainGameApp() {
  const { playerId, callsign, updateCallsign, isLoaded } = usePlayerProfile();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<NavTab>("play");
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [isPreviewingMap, setIsPreviewingMap] = useState(false);
  const [isHostLoading, setIsHostLoading] = useState(false);
  const [isJoinLoading, setIsJoinLoading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active GPS tracking
  const { status: localGpsStatus, coords: localCoords } = useGeolocation((newStatus: GPSStatus) => {
    if (currentRoom && playerId) {
      const socket = getSocket();
      socket.emit("room:update-gps-status", {
        roomCode: currentRoom.roomCode,
        playerId,
        gpsStatus: newStatus,
      });
    }
  });

  // Sync initial GPS status on room join/create
  useEffect(() => {
    if (currentRoom && playerId && localGpsStatus) {
      const socket = getSocket();
      socket.emit("room:update-gps-status", {
        roomCode: currentRoom.roomCode,
        playerId,
        gpsStatus: localGpsStatus,
      });
    }
  }, [currentRoom, playerId, localGpsStatus]);

  // Handle invitation URL query param (?code=TACO42)
  useEffect(() => {
    const inviteCode = searchParams.get("code");
    if (inviteCode && inviteCode.length === 6 && !currentRoom && isLoaded) {
      const socket = getSocket();
      setIsJoinLoading(true);
      socket.emit("room:join", {
        roomCode: inviteCode.toUpperCase().trim(),
        playerId,
        callsign,
      });
    }
  }, [searchParams, currentRoom, isLoaded, playerId, callsign]);

  // Socket event subscriptions
  useEffect(() => {
    const socket = getSocket();

    const handleRoomCreated = (data: { room: Room }) => {
      console.log("🏰 Room created event received:", data.room.roomCode);
      setCurrentRoom(data.room);
      setIsHostLoading(false);
      setErrorMessage(null);
    };

    const handleRoomJoined = (data: { room: Room }) => {
      console.log("🤝 Room joined event received:", data.room.roomCode);
      setCurrentRoom(data.room);
      setIsJoinLoading(false);
      setErrorMessage(null);
    };

    const handlePlayerJoined = (data: { room: Room }) => {
      setCurrentRoom(data.room);
    };

    const handlePlayerLeft = (data: { room: Room | null }) => {
      if (data.room) {
        setCurrentRoom(data.room);
      } else {
        setCurrentRoom(null);
      }
    };

    const handleCodeRegenerated = (data: { oldCode: string; newCode: string; room: Room }) => {
      console.log(`🔄 Room code regenerated: ${data.oldCode} -> ${data.newCode}`);
      setCurrentRoom(data.room);
      setIsRegenerating(false);
    };

    const handleStateUpdated = (data: { room: Room }) => {
      setCurrentRoom(data.room);
      setIsStarting(false);
    };

    const handleGameStarted = (data: { room: Room }) => {
      console.log("🚀 Game started event received!", data.room.roomCode);
      setCurrentRoom(data.room);
      setIsStarting(false);
    };

    const handleRoomError = (error: SocketErrorPayload) => {
      console.error("❌ Room error received:", error);
      setErrorMessage(error.message || "An unexpected error occurred.");
      setIsHostLoading(false);
      setIsJoinLoading(false);
      setIsRegenerating(false);
      setIsStarting(false);
    };

    socket.on("room:created", handleRoomCreated);
    socket.on("room:joined", handleRoomJoined);
    socket.on("room:player-joined", handlePlayerJoined);
    socket.on("room:player-left", handlePlayerLeft);
    socket.on("room:code-regenerated", handleCodeRegenerated);
    socket.on("room:state-updated", handleStateUpdated);
    socket.on("room:game-started", handleGameStarted);
    socket.on("room:error", handleRoomError);

    return () => {
      socket.off("room:created", handleRoomCreated);
      socket.off("room:joined", handleRoomJoined);
      socket.off("room:player-joined", handlePlayerJoined);
      socket.off("room:player-left", handlePlayerLeft);
      socket.off("room:code-regenerated", handleCodeRegenerated);
      socket.off("room:state-updated", handleStateUpdated);
      socket.off("room:game-started", handleGameStarted);
      socket.off("room:error", handleRoomError);
    };
  }, []);

  const handleHostGame = useCallback(async () => {
    if (!playerId || !callsign || isHostLoading) return;
    setIsHostLoading(true);
    setErrorMessage(null);

    const socket = getSocket();
    socket.emit("room:create", { playerId, callsign });

    setTimeout(() => {
      setIsHostLoading((loading) => {
        if (loading) {
          setErrorMessage("Room creation timed out. Check server connection.");
          return false;
        }
        return false;
      });
    }, 6000);
  }, [playerId, callsign, isHostLoading]);

  const handleJoinGame = useCallback(
    async (code: string) => {
      if (!playerId || !callsign || isJoinLoading) return;
      setIsJoinLoading(true);
      setErrorMessage(null);

      const socket = getSocket();
      socket.emit("room:join", {
        roomCode: code.toUpperCase().trim(),
        playerId,
        callsign,
      });

      setTimeout(() => {
        setIsJoinLoading((loading) => {
          if (loading) {
            setErrorMessage("Join request timed out. Check room code or server.");
            return false;
          }
          return false;
        });
      }, 6000);
    },
    [playerId, callsign, isJoinLoading]
  );

  const handleLeaveRoom = useCallback(() => {
    if (!currentRoom || !playerId) return;

    const socket = getSocket();
    socket.emit("room:leave", {
      roomCode: currentRoom.roomCode,
      playerId,
    });

    setCurrentRoom(null);
  }, [currentRoom, playerId]);

  const handleRegenerateCode = useCallback(async () => {
    if (!currentRoom || !playerId || isRegenerating) return;
    setIsRegenerating(true);

    const socket = getSocket();
    socket.emit("room:regenerate-code", {
      oldCode: currentRoom.roomCode,
      requesterPlayerId: playerId,
    });
  }, [currentRoom, playerId, isRegenerating]);

  const handleUpdateRules = useCallback(
    (rulesUpdate: Partial<HouseRules>) => {
      if (!currentRoom || !playerId) return;

      const socket = getSocket();
      socket.emit("room:update-rules", {
        roomCode: currentRoom.roomCode,
        requesterPlayerId: playerId,
        rules: rulesUpdate,
      });
    },
    [currentRoom, playerId]
  );

  const handleUpdateRoleSettings = useCallback(
    (settings: RoleSettings) => {
      if (!currentRoom || !playerId) return;

      const socket = getSocket();
      socket.emit("room:update-role-settings", {
        roomCode: currentRoom.roomCode,
        requesterPlayerId: playerId,
        roleSettings: settings,
      });
    },
    [currentRoom, playerId]
  );

  const handleToggleReady = useCallback(
    (isReady: boolean) => {
      if (!currentRoom || !playerId) return;

      const socket = getSocket();
      socket.emit("room:update-ready", {
        roomCode: currentRoom.roomCode,
        playerId,
        isReady,
      });
    },
    [currentRoom, playerId]
  );

  const handleStartGame = useCallback(async () => {
    if (!currentRoom || !playerId || isStarting) return;
    setIsStarting(true);
    setErrorMessage(null);

    const socket = getSocket();
    socket.emit("room:start-game", {
      roomCode: currentRoom.roomCode,
      requesterPlayerId: playerId,
    });
  }, [currentRoom, playerId, isStarting]);

  if (!isLoaded) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-game-text-muted">
        Initializing tactical system...
      </div>
    );
  }

  // Map Canvas Preview (Day 4 Exploration)
  if (isPreviewingMap) {
    return (
      <GameMapScreen
        onLeaveGame={() => setIsPreviewingMap(false)}
        userCoordinates={localCoords ? [localCoords.lng, localCoords.lat] : null}
      />
    );
  }

  // Active Room -> Match Running (Screen 3: GameMapScreen) or Lobby (Screen 2: GameLobbyScreen)
  if (currentRoom) {
    if (currentRoom.status === "STARTING" || currentRoom.status === "IN_PROGRESS") {
      return (
        <GameMapScreen
          room={currentRoom}
          currentPlayerId={playerId}
          onLeaveGame={handleLeaveRoom}
          userCoordinates={localCoords ? [localCoords.lng, localCoords.lat] : null}
        />
      );
    }

    return (
      <GameLobbyScreen
        room={currentRoom}
        currentPlayerId={playerId}
        onLeaveRoom={handleLeaveRoom}
        onRegenerateCode={handleRegenerateCode}
        onUpdateRules={handleUpdateRules}
        onUpdateRoleSettings={handleUpdateRoleSettings}
        onToggleReady={handleToggleReady}
        onStartGame={handleStartGame}
        isRegenerating={isRegenerating}
        isStarting={isStarting}
        errorMessage={errorMessage}
        onClearError={() => setErrorMessage(null)}
      />
    );
  }

  // Standalone Navigation Views
  return (
    <>
      {activeTab === "play" && (
        <HomeScreen
          callsign={callsign}
          onUpdateCallsign={updateCallsign}
          onHostGame={handleHostGame}
          onJoinGame={handleJoinGame}
          isHostLoading={isHostLoading}
          isJoinLoading={isJoinLoading}
          errorMessage={errorMessage}
          onClearError={() => setErrorMessage(null)}
          onPreviewMap={() => setIsPreviewingMap(true)}
        />
      )}

      {activeTab === "stats" && <StatsView />}

      {activeTab === "rules" && <RulesView />}

      {activeTab === "profile" && (
        <ProfileView
          playerId={playerId}
          callsign={callsign}
          onUpdateCallsign={updateCallsign}
        />
      )}

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </>
  );
}

export default function AppRoot() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center text-xs text-game-text-muted">Loading HIDERUSH...</div>}>
      <MainGameApp />
    </Suspense>
  );
}
