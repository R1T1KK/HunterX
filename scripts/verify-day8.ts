/**
 * HIDERUSH — Day 8 Automated Acceptance Audit
 * Verifies Authoritative Game Loop, 30-Second Head-Start Scatter Countdown,
 * State Machine (LOBBY -> COUNTDOWN -> IN_PROGRESS -> COMPLETED),
 * Backend GPS Privacy Guard, and Synchronization.
 */

import http from "http";
import { Server as SocketIOServer } from "../server/node_modules/socket.io/dist/index.js";
import { io as ClientIO } from "../server/node_modules/socket.io-client/build/cjs/index.js";
import { registerRoomHandlers } from "../server/src/socket/roomGateway.js";
import { roomManager } from "../server/src/services/RoomManager.js";
import { gameManager } from "../server/src/services/GameManager.js";
import { locationManager } from "../server/src/services/LocationManager.js";
import {
  GameCountdownPayload,
  MatchClockPayload,
  GameStartedPayload,
  GameEndedPayload,
} from "../server/src/types/index.js";

interface AssertResult {
  title: string;
  passed: boolean;
  details?: string;
}

const results: AssertResult[] = [];

function assert(condition: boolean, title: string, details?: string) {
  results.push({ title, passed: Boolean(condition), details });
  if (condition) {
    console.log(`  ✓ ${title}`);
  } else {
    console.error(`  ✗ FAIL: ${title} — ${details || "Assertion failed"}`);
  }
}

async function runDay8Verification() {
  console.log("\n=======================================================");
  console.log("🎮 HIDERUSH DAY 8: AUTHORITATIVE GAME LOOP AUDIT");
  console.log("=======================================================\n");

  roomManager.resetAll();
  gameManager.resetAll();
  locationManager.resetAll();

  const httpServer = http.createServer();
  const io = new SocketIOServer(httpServer, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    registerRoomHandlers(io, socket);
  });

  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  const port = (httpServer.address() as any).port;
  const serverUrl = `http://localhost:${port}`;

  console.log(`[Test Server] Running on ${serverUrl}`);

  // Create two client sockets: Hunter and Runner
  const clientHunter = ClientIO(serverUrl, { transports: ["websocket"] });
  const clientRunner = ClientIO(serverUrl, { transports: ["websocket"] });

  await Promise.all([
    new Promise((resolve) => clientHunter.on("connect", resolve)),
    new Promise((resolve) => clientRunner.on("connect", resolve)),
  ]);

  assert(clientHunter.connected && clientRunner.connected, "Sockets connected successfully");

  // SECTION 1: Room Creation & GPS Lock
  console.log("\n--- Section 1: Room Creation & GPS Lock Preconditions ---");
  let roomCode = "";

  const createPromise = new Promise<{ room: any }>((resolve) => {
    clientHunter.emit(
      "room:create",
      { playerId: "hunter_host_1", callsign: "AlphaHunter" },
      (res: any) => resolve(res.data)
    );
  });

  const created = await createPromise;
  roomCode = created.room.roomCode;
  assert(Boolean(roomCode && roomCode.length === 6), `Room created with code ${roomCode}`);
  assert(created.room.status === "WAITING" || created.room.status === "LOBBY", "Initial room status is WAITING/LOBBY");

  // Runner joins
  const joinPromise = new Promise<any>((resolve) => {
    clientRunner.emit(
      "room:join",
      { roomCode, playerId: "runner_peer_2", callsign: "ShadowRunner" },
      (res: any) => resolve(res.data)
    );
  });
  const joined = await joinPromise;
  assert(joined.room.players.length === 2, "Both players present in room roster");

  // Acquire GPS lock on both mobile devices
  await new Promise<void>((resolve) => {
    clientHunter.emit("room:update-gps-status", { roomCode, playerId: "hunter_host_1", gpsStatus: "LOCKED" }, () => resolve());
  });
  await new Promise<void>((resolve) => {
    clientRunner.emit("room:update-gps-status", { roomCode, playerId: "runner_peer_2", gpsStatus: "LOCKED" }, () => resolve());
  });

  const checkStart = roomManager.canStartGame(roomCode, "hunter_host_1");
  assert(checkStart.canStart, "Game can start: 2 confirmed GPS locks verified");

  // SECTION 2: Authoritative Match Start & 30s Countdown
  console.log("\n--- Section 2: Authoritative Match Start & 30s Countdown ---");

  const countdownPromiseHunter = new Promise<GameCountdownPayload>((resolve) => {
    clientHunter.once("game:start_countdown", resolve);
  });
  const countdownPromiseRunner = new Promise<GameCountdownPayload>((resolve) => {
    clientRunner.once("game:start_countdown", resolve);
  });

  // Host starts the match
  clientHunter.emit("room:start-game", { roomCode, requesterPlayerId: "hunter_host_1" });

  const [cdHunter, cdRunner] = await Promise.all([countdownPromiseHunter, countdownPromiseRunner]);

  assert(cdHunter.matchId === cdRunner.matchId, "Both clients receive identical authoritative matchId");
  assert(cdHunter.gameState === "COUNTDOWN", "Game state transitioned to COUNTDOWN");
  assert(cdHunter.headStartDurationSeconds === 30, "Head-Start duration is exactly 30 seconds");
  assert(cdHunter.headStartEndsAt > cdHunter.startedAt, "headStartEndsAt is in future (+30s)");
  assert(cdHunter.remainingSeconds === 30, "Initial remainingSeconds is 30");

  // Check role distribution
  const hunterPlayer = cdHunter.room.players.find((p: any) => p.playerId === "hunter_host_1");
  const runnerPlayer = cdHunter.room.players.find((p: any) => p.playerId === "runner_peer_2");

  assert(hunterPlayer && runnerPlayer, "Both players exist in updated room");
  assert(
    (hunterPlayer.role === "HUNTER" && runnerPlayer.role === "RUNNER") ||
    (hunterPlayer.role === "RUNNER" && runnerPlayer.role === "HUNTER"),
    "Server-authoritatively assigned roles: 1 Hunter and 1 Runner"
  );

  // SECTION 3: 1Hz Clock Ticks & Synchronization
  console.log("\n--- Section 3: 1Hz Clock Ticks & Reconnect Synchronization ---");

  const tickPromise = new Promise<MatchClockPayload>((resolve) => {
    clientRunner.once("game:timer_tick", resolve);
  });

  const firstTick = await tickPromise;
  assert(firstTick.gameState === "COUNTDOWN", "Timer tick gameState is COUNTDOWN");
  assert(firstTick.phase === "HEAD_START", "Timer tick phase is HEAD_START");
  assert(firstTick.remainingSeconds <= 30 && firstTick.remainingSeconds >= 28, "Tick remainingSeconds accurately decrementing");

  // Test Reconnect Sync
  const syncPromise = new Promise<any>((resolve) => {
    clientHunter.emit("game:sync", { roomCode }, (res: any) => resolve(res.data));
  });

  const syncData = await syncPromise;
  assert(syncData && syncData.sync, "game:sync returned active snapshot");
  assert(syncData.sync.gameState === "COUNTDOWN", "Sync snapshot indicates COUNTDOWN state");
  assert(syncData.sync.phase === "HEAD_START", "Sync phase indicates HEAD_START");
  assert(syncData.sync.headStartEndsAt === cdHunter.headStartEndsAt, "Sync headStartEndsAt matches official timestamp");

  // SECTION 4: Mandatory Backend GPS Privacy Guard during Head-Start
  console.log("\n--- Section 4: Mandatory Backend GPS Privacy Guard ---");

  // Determine who is Runner and who is Hunter
  const runnerSocket = hunterPlayer.role === "RUNNER" ? clientHunter : clientRunner;
  const hunterSocket = hunterPlayer.role === "HUNTER" ? clientHunter : clientRunner;
  const runnerId = hunterPlayer.role === "RUNNER" ? "hunter_host_1" : "runner_peer_2";

  let hunterReceivedRunnerLocation = false;
  const hunterLeakListener = (payload: any) => {
    if (payload.playerId === runnerId) {
      hunterReceivedRunnerLocation = true;
    }
  };
  hunterSocket.on("location:player-updated", hunterLeakListener);

  // Runner streams location update during COUNTDOWN
  runnerSocket.emit("location:update", {
    roomCode,
    playerId: runnerId,
    lat: 28.6139,
    lng: 77.2090,
    accuracy: 5.0,
    heading: 90,
    speed: 3.5,
    timestamp: Date.now(),
  });

  // Wait 300ms to allow network processing
  await new Promise((r) => setTimeout(r, 300));

  hunterSocket.off("location:player-updated", hunterLeakListener);
  assert(
    !hunterReceivedRunnerLocation,
    "MANDATORY PRIVACY: Hunter received ZERO runner location packets during COUNTDOWN"
  );

  // SECTION 5: Fast-Forward to Map Unlock (00:00 -> IN_PROGRESS)
  console.log("\n--- Section 5: Transition to IN_PROGRESS & Map Unlock ---");

  // Fast forward headStartEndsAt by modifying session directly for test verification
  const session = gameManager.getMatch(roomCode);
  assert(Boolean(session), "MatchSession active in GameManager");

  if (session) {
    session.headStartEndsAt = Date.now() - 500; // Expired!
  }

  const unlockPromiseHunter = new Promise<GameStartedPayload>((resolve) => {
    clientHunter.once("game:started", resolve);
  });
  const unlockPromiseRunner = new Promise<GameStartedPayload>((resolve) => {
    clientRunner.once("game:started", resolve);
  });

  const [unlockH, unlockR] = await Promise.all([unlockPromiseHunter, unlockPromiseRunner]);

  assert(unlockH.gameState === "IN_PROGRESS", "Game transitioned to IN_PROGRESS upon head-start expiration");
  assert(unlockR.gameState === "IN_PROGRESS", "Runner received IN_PROGRESS start confirmation");
  assert(unlockH.room.status === "IN_PROGRESS", "Room status updated to IN_PROGRESS");

  // Now, in IN_PROGRESS, runner locations MUST be broadcast to hunters
  let hunterReceivedAfterUnlock = false;
  const afterUnlockPromise = new Promise<void>((resolve) => {
    hunterSocket.once("location:player-updated", (payload: any) => {
      if (payload.playerId === runnerId) {
        hunterReceivedAfterUnlock = true;
        resolve();
      }
    });
  });

  // Wait 1.1s for rate limiter leeway
  await new Promise((r) => setTimeout(r, 1100));

  runnerSocket.emit(
    "location:update",
    {
      roomCode,
      playerId: runnerId,
      lat: 28.613915,
      lng: 77.209015,
      accuracy: 5.0,
      heading: 90,
      speed: 1.5,
      timestamp: Date.now(),
    },
    (res: any) => {
      if (!res?.success) {
        console.error("Location update failed in audit:", res?.error);
      }
    }
  );

  await Promise.race([afterUnlockPromise, new Promise((r) => setTimeout(r, 1000))]);
  assert(
    hunterReceivedAfterUnlock,
    "MAP UNLOCKED: Hunter successfully receives runner coordinates after head-start expires"
  );

  // Teardown
  clientHunter.disconnect();
  clientRunner.disconnect();
  gameManager.resetAll();
  httpServer.close();

  console.log("\n=======================================================");
  const passedCount = results.filter((r) => r.passed).length;
  console.log(`Day 8 Audit Summary: ${passedCount}/${results.length} tests passed.`);
  console.log("=======================================================\n");

  if (passedCount < results.length) {
    process.exit(1);
  }
}

runDay8Verification().catch((err) => {
  console.error("FATAL Day 8 Verification Error:", err);
  process.exit(1);
});
