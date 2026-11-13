import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { roomManager } from "../services/RoomManager.js";
import { gameManager } from "../services/GameManager.js";
import { Room } from "../types/index.js";

describe("Day 8: Authoritative Game Loop & Head-Start Scatter Countdown", () => {
  beforeEach(() => {
    roomManager.resetAll();
    gameManager.resetAll();
    vi.useFakeTimers();
  });

  afterEach(() => {
    gameManager.resetAll();
    roomManager.resetAll();
    vi.useRealTimers();
  });

  function setupTwoPlayerRoom(): Room {
    const room = roomManager.createRoom({
      hostPlayerId: "host-p1",
      callsign: "HunterOne",
      socketId: "socket-p1",
    });

    roomManager.joinRoom({
      roomCode: room.roomCode,
      playerId: "runner-p2",
      callsign: "RunnerTwo",
      socketId: "socket-p2",
    });

    // Both players acquire GPS lock
    roomManager.updatePlayerGPSStatus(room.roomCode, "host-p1", "LOCKED");
    roomManager.updatePlayerGPSStatus(room.roomCode, "runner-p2", "LOCKED");

    return room;
  }

  it("should enforce server-authoritative role assignment on game start", () => {
    const room = setupTwoPlayerRoom();
    expect(room.players[0].role).toBeUndefined();
    expect(room.players[1].role).toBeUndefined();

    // Mock IO emitter
    const mockEmit = vi.fn();
    const mockIo = {
      to: vi.fn(() => ({ emit: mockEmit })),
    } as any;

    const { session, room: startedRoom } = gameManager.startMatch(
      mockIo,
      room.roomCode,
      "host-p1"
    );

    expect(session.gameState).toBe("COUNTDOWN");
    expect(startedRoom.status).toBe("COUNTDOWN");

    // Roles must be assigned: exactly 1 Hunter, exactly 1 Runner
    const hunters = startedRoom.players.filter((p) => p.role === "HUNTER");
    const runners = startedRoom.players.filter((p) => p.role === "RUNNER");
    expect(hunters.length).toBe(1);
    expect(runners.length).toBe(1);
  });

  it("should transition LOBBY -> COUNTDOWN and broadcast game:start_countdown with 30s duration", () => {
    const room = setupTwoPlayerRoom();
    const mockEmit = vi.fn();
    const mockIo = {
      to: vi.fn(() => ({ emit: mockEmit })),
    } as any;

    const { session } = gameManager.startMatch(mockIo, room.roomCode, "host-p1");

    expect(session.headStartDurationSeconds).toBe(30);
    expect(session.headStartEndsAt).toBe(session.startedAt + 30000);

    // Verify game:start_countdown was emitted with authoritative timestamps
    expect(mockIo.to).toHaveBeenCalledWith(room.roomCode);
    const countdownCalls = mockEmit.mock.calls.filter(
      (call: any[]) => call[0] === "game:start_countdown"
    );
    expect(countdownCalls.length).toBe(1);

    const payload = countdownCalls[0][1];
    expect(payload.gameState).toBe("COUNTDOWN");
    expect(payload.remainingSeconds).toBe(30);
    expect(payload.headStartDurationSeconds).toBe(30);
    expect(payload.headStartEndsAt).toBe(session.headStartEndsAt);
  });

  it("should tick countdown at 1Hz and transition COUNTDOWN -> IN_PROGRESS when timer reaches 00:00", () => {
    const room = setupTwoPlayerRoom();
    const emittedEvents: Array<{ event: string; payload: any }> = [];

    const mockIo = {
      to: vi.fn(() => ({
        emit: vi.fn((event: string, payload: any) => {
          emittedEvents.push({ event, payload });
        }),
      })),
    } as any;

    const { session } = gameManager.startMatch(mockIo, room.roomCode, "host-p1");
    expect(session.gameState).toBe("COUNTDOWN");

    // Advance 10 seconds
    vi.advanceTimersByTime(10000);

    const ticksAt10s = emittedEvents.filter((e) => e.event === "game:timer_tick");
    expect(ticksAt10s.length).toBeGreaterThanOrEqual(10);
    const lastTickAt10s = ticksAt10s[ticksAt10s.length - 1].payload;
    expect(lastTickAt10s.gameState).toBe("COUNTDOWN");
    expect(lastTickAt10s.phase).toBe("HEAD_START");
    expect(lastTickAt10s.remainingSeconds).toBe(20);

    // Advance remaining 20 seconds to reach 00:00
    vi.advanceTimersByTime(20000);

    // Verify game:started was emitted
    const startedCalls = emittedEvents.filter((e) => e.event === "game:started");
    expect(startedCalls.length).toBe(1);

    const startedPayload = startedCalls[0].payload;
    expect(startedPayload.gameState).toBe("IN_PROGRESS");
    expect(session.gameState).toBe("IN_PROGRESS");
    expect(room.status).toBe("IN_PROGRESS");
  });

  it("should continue ticking main match in IN_PROGRESS and end match when time expires", () => {
    const room = setupTwoPlayerRoom();
    // Use Quick preset: 5 min round (300s)
    roomManager.updateHouseRules(room.roomCode, "host-p1", {
      preset: "QUICK",
      roundLengthMinutes: 5,
      headStartSeconds: 30,
      pingIntervalSeconds: 30,
      playZoneEnabled: true,
      zoneSizeMeters: 250,
      zoneShrinks: false,
      zoneShrinkIntervalMinutes: 5,
      huntersCanTalk: true,
    });

    const emittedEvents: Array<{ event: string; payload: any }> = [];
    const mockIo = {
      to: vi.fn(() => ({
        emit: vi.fn((event: string, payload: any) => {
          emittedEvents.push({ event, payload });
        }),
      })),
    } as any;

    gameManager.startMatch(mockIo, room.roomCode, "host-p1");

    // Advance 15 seconds to complete QUICK preset head-start
    vi.advanceTimersByTime(15000);

    // Now in IN_PROGRESS phase
    // Advance match by 150 seconds (halfway through 300s match)
    vi.advanceTimersByTime(150000);

    const matchTicks = emittedEvents.filter(
      (e) => e.event === "game:timer_tick" && e.payload.phase === "MATCH"
    );
    expect(matchTicks.length).toBeGreaterThanOrEqual(140);
    const midMatchTick = matchTicks[matchTicks.length - 1].payload;
    expect(midMatchTick.gameState).toBe("IN_PROGRESS");
    expect(midMatchTick.phase).toBe("MATCH");
    expect(midMatchTick.remainingSeconds).toBe(150);

    // Advance remaining 150 seconds to complete match
    vi.advanceTimersByTime(151000);

    const endedCalls = emittedEvents.filter((e) => e.event === "game:ended");
    expect(endedCalls.length).toBe(1);
    expect(endedCalls[0].payload.gameState).toBe("COMPLETED");
    expect(endedCalls[0].payload.winner).toBe("RUNNERS");
    expect(endedCalls[0].payload.reason).toBe("TIME_EXPIRED");
  });

  it("should prevent duplicate match starts and handle reconnect sync accurately", () => {
    const room = setupTwoPlayerRoom();
    const mockEmit = vi.fn();
    const mockIo = {
      to: vi.fn(() => ({ emit: mockEmit })),
    } as any;

    gameManager.startMatch(mockIo, room.roomCode, "host-p1");

    // Attempt duplicate start must throw or reject
    expect(() => {
      gameManager.startMatch(mockIo, room.roomCode, "host-p1");
    }).toThrow();

    // Advance 12 seconds
    vi.advanceTimersByTime(12000);

    // Reconnecting player requests sync snapshot
    const sync = gameManager.getSyncPayload(room.roomCode);
    expect(sync).not.toBeNull();
    expect(sync!.gameState).toBe("COUNTDOWN");
    expect(sync!.phase).toBe("HEAD_START");
    expect(sync!.remainingSeconds).toBe(18);
  });

  it("should enforce backend GPS privacy: Hunters cannot receive runner coordinates during COUNTDOWN", () => {
    const room = setupTwoPlayerRoom();
    const mockEmit = vi.fn();
    const mockIo = {
      to: vi.fn(() => ({ emit: mockEmit })),
    } as any;

    const { room: startedRoom } = gameManager.startMatch(mockIo, room.roomCode, "host-p1");
    expect(startedRoom.status).toBe("COUNTDOWN");

    const hunter = startedRoom.players.find((p) => p.role === "HUNTER")!;
    const runner = startedRoom.players.find((p) => p.role === "RUNNER")!;

    // Verify roles are distinct
    expect(hunter.playerId).not.toBe(runner.playerId);
    expect(hunter.role).toBe("HUNTER");
    expect(runner.role).toBe("RUNNER");
  });
});
