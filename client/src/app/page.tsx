"use client";

import React, { useState, useEffect, useCallback } from "react";
import { getSocket } from "@/services/socketService";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";
import { Room, SocketErrorPayload } from "@/types";
import { HomeScreen } from "@/components/home/HomeScreen";
import { WaitingRoom } from "@/components/lobby/WaitingRoom";
import { BottomNav, NavTab } from "@/components/navigation/BottomNav";
import { StatsView } from "@/components/views/StatsView";
import { RulesView } from "@/components/views/RulesView";
import { ProfileView } from "@/components/views/ProfileView";

export default function AppRoot() {
  const { playerId, callsign, updateCallsign, isLoaded } = usePlayerProfile();
  const [activeTab, setActiveTab] = useState<NavTab>("play");
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [isHostLoading, setIsHostLoading] = useState(false);
  const [isJoinLoading, setIsJoinLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      console.log("👥 Other player joined room:", data.room.players.length);
      setCurrentRoom(data.room);
    };

    const handlePlayerLeft = (data: { room: Room | null }) => {
      console.log("👋 Player left room, remaining:", data.room?.players.length);
      if (data.room) {
        setCurrentRoom(data.room);
      } else {
        setCurrentRoom(null);
      }
    };

    const handleStateUpdated = (data: { room: Room }) => {
      setCurrentRoom(data.room);
    };

    const handleRoomError = (error: SocketErrorPayload) => {
      console.error("❌ Room error received:", error);
      setErrorMessage(error.message || "An unexpected error occurred.");
      setIsHostLoading(false);
      setIsJoinLoading(false);
    };

    socket.on("room:created", handleRoomCreated);
    socket.on("room:joined", handleRoomJoined);
    socket.on("room:player-joined", handlePlayerJoined);
    socket.on("room:player-left", handlePlayerLeft);
    socket.on("room:state-updated", handleStateUpdated);
    socket.on("room:error", handleRoomError);

    return () => {
      socket.off("room:created", handleRoomCreated);
      socket.off("room:joined", handleRoomJoined);
      socket.off("room:player-joined", handlePlayerJoined);
      socket.off("room:player-left", handlePlayerLeft);
      socket.off("room:state-updated", handleStateUpdated);
      socket.off("room:error", handleRoomError);
    };
  }, []);

  const handleHostGame = useCallback(async () => {
    if (!playerId || !callsign || isHostLoading) return;
    setIsHostLoading(true);
    setErrorMessage(null);

    const socket = getSocket();
    socket.emit("room:create", { playerId, callsign });

    // Safety timeout in case backend is unresponsive
    setTimeout(() => {
      setIsHostLoading((loading) => {
        if (loading) {
          setErrorMessage("Room creation timed out. Check server connection.");
          return false;
        }
        return false;
      });
    }, 5000);
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

      // Safety timeout
      setTimeout(() => {
        setIsJoinLoading((loading) => {
          if (loading) {
            setErrorMessage("Join request timed out. Check room code or server.");
            return false;
          }
          return false;
        });
      }, 5000);
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

  if (!isLoaded) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-game-text-muted">
        Initializing tactical system...
      </div>
    );
  }

  // If in an active waiting room, render the waiting room (takes priority over home tabs)
  if (currentRoom) {
    return (
      <WaitingRoom
        room={currentRoom}
        currentPlayerId={playerId}
        onLeaveRoom={handleLeaveRoom}
      />
    );
  }

  // Otherwise render active navigation tab
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
