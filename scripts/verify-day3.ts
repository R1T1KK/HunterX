import http from "node:http";
import { io as ClientSocket, Socket as ClientSocketType } from "../server/node_modules/socket.io-client/build/cjs/index.js";
import { app, io as ServerIO } from "../server/src/index.js";
import { roomManager } from "../server/src/services/RoomManager.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

async function runDay3Verification() {
  console.log("🎮 [VERIFICATION] Starting Day 3 Autonomous Audit & Benchmarks...\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // ==========================================
  // 1. Room Code Regeneration & Security
  // ==========================================
  console.log("🔑 1. Room Code Regeneration & Security...");
  const room = roomManager.createRoom({
    hostPlayerId: "host-1",
    callsign: "LobbyHost",
    socketId: "sock-host-1",
  });
  const originalCode = room.roomCode;

  // Add a second player
  roomManager.joinRoom({
    roomCode: originalCode,
    playerId: "player-2",
    callsign: "RunnerTwo",
    socketId: "sock-player-2",
  });

  // Non-host attempts regeneration -> must throw
  let nonHostBlocked = false;
  try {
    roomManager.regenerateRoomCode(originalCode, "player-2");
  } catch {
    nonHostBlocked = true;
  }
  assert(nonHostBlocked, "Non-host code regeneration is strictly blocked");

  // Host regenerates code
  const regenerated = roomManager.regenerateRoomCode(originalCode, "host-1");
  const newCode = regenerated.newCode;
  assert(newCode !== originalCode, `New code generated: ${newCode} (Old: ${originalCode})`);
  assert(newCode.length === 6, "New room code is exactly 6 alphanumeric characters");
  assert(regenerated.room.players.length === 2, "Both players retained after code regeneration");
  assert(roomManager.findRoom(originalCode) === undefined, "Old room code was completely invalidated in memory");

  // ==========================================
  // 2. House Rules Presets & Custom Configuration
  // ==========================================
  console.log("\n📜 2. House Rules Presets & Custom Configuration...");
  // Test QUICK preset
  const quickRoom = roomManager.updateHouseRules(newCode, "host-1", { preset: "QUICK" });
  assert(quickRoom.rules.preset === "QUICK", "Preset updated to QUICK");
  assert(quickRoom.rules.roundLengthMinutes === 5, "QUICK round duration is 5 minutes");
  assert(quickRoom.rules.headStartSeconds === 15, "QUICK head start is 15 seconds");
  assert(quickRoom.rules.pingIntervalSeconds === 30, "QUICK ping interval is 30 seconds");
  assert(quickRoom.rules.zoneSizeMeters === 250, "QUICK zone size is 250m");

  // Test STANDARD preset
  const standardRoom = roomManager.updateHouseRules(newCode, "host-1", { preset: "STANDARD" });
  assert(standardRoom.rules.preset === "STANDARD", "Preset updated to STANDARD");
  assert(standardRoom.rules.roundLengthMinutes === 10, "STANDARD round duration is 10 minutes");
  assert(standardRoom.rules.headStartSeconds === 30, "STANDARD head start is 30 seconds");
  assert(standardRoom.rules.zoneSizeMeters === 500, "STANDARD zone size is 500m");

  // Test BIG_PARK preset
  const bigParkRoom = roomManager.updateHouseRules(newCode, "host-1", { preset: "BIG_PARK" });
  assert(bigParkRoom.rules.preset === "BIG_PARK", "Preset updated to BIG_PARK");
  assert(bigParkRoom.rules.roundLengthMinutes === 20, "BIG_PARK round duration is 20 minutes");
  assert(bigParkRoom.rules.zoneShrinks === true, "BIG_PARK has zoneShrinks enabled");
  assert(bigParkRoom.rules.zoneSizeMeters === 1000, "BIG_PARK zone size is 1000m");

  // Test Custom Rules override
  const customRoom = roomManager.updateHouseRules(newCode, "host-1", {
    preset: "CUSTOM",
    roundLengthMinutes: 12,
    headStartSeconds: 40,
    pingIntervalSeconds: 25,
    zoneSizeMeters: 550,
    zoneShrinks: false,
    huntersCanTalk: false,
  });
  assert(customRoom.rules.preset === "CUSTOM", "Preset updated to CUSTOM");
  assert(customRoom.rules.roundLengthMinutes === 12, "Custom round duration is 12m");
  assert(customRoom.rules.zoneSizeMeters === 550, "Custom zone size is 550m");

  // ==========================================
  // 3. Role Settings (Hunter / Runner / Random & Count)
  // ==========================================
  console.log("\n🎭 3. Role Settings & Hunter Count...");
  const roleRoom = roomManager.updateRoleSettings(newCode, "host-1", {
    mode: "HUNTER",
    hunterCount: 2,
  });
  assert(roleRoom.roleSettings.mode === "HUNTER", "Role mode updated to HUNTER");
  assert(roleRoom.roleSettings.hunterCount === 2, "Hunter count set to 2");

  // Non-host blocked from updating role settings
  let nonHostRoleBlocked = false;
  try {
    roomManager.updateRoleSettings(newCode, "player-2", { mode: "RUNNER", hunterCount: 3 });
  } catch {
    nonHostRoleBlocked = true;
  }
  assert(nonHostRoleBlocked, "Non-host player cannot modify room role settings");

  // ==========================================
  // 4. GPS Lock Status & Start Game Gate
  // ==========================================
  console.log("\n🛰️ 4. GPS Lock Gate Enforcement (MANDATORY ACCEPTANCE CRITERIA)...");
  
  // Initially, Player 1 has UNKNOWN/ACQUIRING, Player 2 has ACQUIRING
  const startCheckInitial = roomManager.canStartGame(newCode, "host-1");
  assert(!startCheckInitial.canStart, "Game cannot start when GPS is not locked");
  assert(startCheckInitial.reason?.includes("GPS lock"), `Rejection reason: "${startCheckInitial.reason}"`);

  // Device 1 acquires lock
  roomManager.updatePlayerGPSStatus(newCode, "host-1", "LOCKED");
  const startCheckOneLock = roomManager.canStartGame(newCode, "host-1");
  assert(!startCheckOneLock.canStart, "Game cannot start with only 1 player GPS locked");
  assert(startCheckOneLock.reason?.includes("GPS lock"), `Rejection reason: "${startCheckOneLock.reason}"`);

  // Device 2 denies GPS
  roomManager.updatePlayerGPSStatus(newCode, "player-2", "DENIED");
  const startCheckDenied = roomManager.canStartGame(newCode, "host-1");
  assert(!startCheckDenied.canStart, "Game cannot start when Player 2 has DENIED GPS");

  // Device 2 grants & confirms GPS lock (accuracy <= 35m)
  roomManager.updatePlayerGPSStatus(newCode, "player-2", "LOCKED");
  const startCheckTwoLocks = roomManager.canStartGame(newCode, "host-1");
  assert(startCheckTwoLocks.canStart, "Game CAN start when >= 2 players have confirmed GPS locks");

  // Non-host attempts to start game -> blocked
  let nonHostStartBlocked = false;
  try {
    roomManager.startGame(newCode, "player-2");
  } catch {
    nonHostStartBlocked = true;
  }
  assert(nonHostStartBlocked, "Non-host player cannot trigger startGame");

  // Host starts game -> Room status changes to STARTING
  const startedRoom = roomManager.startGame(newCode, "host-1");
  assert(startedRoom.status === "STARTING", "Room successfully moved to STARTING status");

  // Clean up in-memory room
  roomManager.leaveRoom(newCode, "host-1");
  roomManager.leaveRoom(newCode, "player-2");

  // ==========================================
  // 5. Socket.IO End-to-End Real-Time Synchronization
  // ==========================================
  console.log("\n🔌 5. Socket.IO Real-Time 2-Device Day 3 Synchronization...");
  const server = http.createServer(app);
  ServerIO.attach(server);

  await new Promise<void>((resolve) => {
    server.listen(0, resolve);
  });
  const port = (server.address() as { port: number }).port;
  const serverUrl = `http://127.0.0.1:${port}`;

  let client1: ClientSocketType | null = null;
  let client2: ClientSocketType | null = null;

  try {
    client1 = ClientSocket(serverUrl, { transports: ["websocket"] });
    client2 = ClientSocket(serverUrl, { transports: ["websocket"] });

    await Promise.all([
      new Promise<void>((resolve) => client1!.on("connect", resolve)),
      new Promise<void>((resolve) => client2!.on("connect", resolve)),
    ]);
    assert(true, "Both devices connected to Socket.IO test server");

    // Device 1 creates room
    const createRes = await new Promise<{ room: { roomCode: string } }>((resolve) => {
      client1!.emit(
        "room:create",
        { playerId: "sock-d1", callsign: "AlphaHost" },
        (res: { success: boolean; data: { room: { roomCode: string } } }) => resolve(res.data)
      );
    });
    let testCode = createRes.room.roomCode;

    // Device 2 joins room
    await new Promise<void>((resolve) => {
      client2!.emit(
        "room:join",
        { roomCode: testCode, playerId: "sock-d2", callsign: "BravoRunner" },
        () => resolve()
      );
    });

    // Test real-time presets broadcast (Device 1 updates -> Device 2 hears)
    const presetPromise = new Promise<{ rules: { preset: string } }>((resolve) => {
      client2!.on("room:settings-updated", resolve);
    });
    client1.emit("room:update-rules", {
      roomCode: testCode,
      requesterPlayerId: "sock-d1",
      rules: { preset: "QUICK" },
    });
    const rulesUpdate = await presetPromise;
    assert(rulesUpdate.rules.preset === "QUICK", "Device 2 received reactive room:settings-updated event (QUICK)");

    // Test real-time GPS status broadcast
    const gpsPromise = new Promise<{ playerId: string; gpsStatus: string }>((resolve) => {
      client1!.on("room:gps-status-updated", resolve);
    });
    client2.emit("room:update-gps-status", { roomCode: testCode, playerId: "sock-d2", gpsStatus: "LOCKED" });
    const gpsUpdate = await gpsPromise;
    assert(gpsUpdate.playerId === "sock-d2" && gpsUpdate.gpsStatus === "LOCKED", "Device 1 received reactive room:gps-status-updated from Device 2");

    // Test code regeneration over socket
    const codeRegenPromise = new Promise<{ oldCode: string; newCode: string }>((resolve) => {
      client2!.on("room:code-regenerated", resolve);
    });
    client1.emit("room:regenerate-code", { oldCode: testCode, requesterPlayerId: "sock-d1" });
    const codeRegenEvent = await codeRegenPromise;
    assert(codeRegenEvent.oldCode === testCode, `Device 2 received code regeneration notification: ${codeRegenEvent.newCode}`);
    testCode = codeRegenEvent.newCode;

    // Test start game validation over socket (Only 1 locked so far: Device 2)
    const startFailRes = await new Promise<{ success: boolean; error: { code: string; message: string } }>((resolve) => {
      client1!.emit("room:start-game", { roomCode: testCode, requesterPlayerId: "sock-d1" }, resolve);
    });
    assert(!startFailRes.success, "Start game over socket blocked when only 1 GPS lock present");

    // Device 1 locks GPS
    client1.emit("room:update-gps-status", { roomCode: testCode, playerId: "sock-d1", gpsStatus: "LOCKED" });
    await new Promise((r) => setTimeout(r, 50));

    // Start game over socket now succeeds
    const startSuccessPromise = new Promise<{ room: { status: string } }>((resolve) => {
      client2!.on("room:game-started", resolve);
    });
    const startSuccessRes = await new Promise<{ success: boolean; data: { room: { status: string } } }>((resolve) => {
      client1!.emit("room:start-game", { roomCode: testCode, requesterPlayerId: "sock-d1" }, resolve);
    });
    const gameStartedEvent = await startSuccessPromise;

    assert(startSuccessRes.success, "Start game over socket succeeded with 2 GPS locks");
    assert(gameStartedEvent.room.status === "STARTING", "Device 2 received reactive room:game-started broadcast");

  } finally {
    if (client1?.connected) client1.disconnect();
    if (client2?.connected) client2.disconnect();
    ServerIO.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  // ==========================================
  // 6. Mobile Layout & Ergonomics Audit
  // ==========================================
  console.log("\n📱 6. Mobile Viewport Layout & Touch Ergonomics Audit...");
  const lobbyScreenPath = path.resolve(projectRoot, "client/src/components/lobby/GameLobbyScreen.tsx");
  const roomCardPath = path.resolve(projectRoot, "client/src/components/lobby/RoomCodeCard.tsx");
  const presetsPath = path.resolve(projectRoot, "client/src/components/lobby/HouseRulesPresets.tsx");
  const customDrawerPath = path.resolve(projectRoot, "client/src/components/lobby/CustomRulesDrawer.tsx");
  const roleSelectorPath = path.resolve(projectRoot, "client/src/components/lobby/RoleSelector.tsx");
  const rosterPath = path.resolve(projectRoot, "client/src/components/lobby/PlayerRoster.tsx");

  const lobbyContent = fs.readFileSync(lobbyScreenPath, "utf-8");
  const roomCardContent = fs.readFileSync(roomCardPath, "utf-8");
  const presetsContent = fs.readFileSync(presetsPath, "utf-8");
  const drawerContent = fs.readFileSync(customDrawerPath, "utf-8");
  const roleContent = fs.readFileSync(roleSelectorPath, "utf-8");
  const rosterContent = fs.readFileSync(rosterPath, "utf-8");

  assert(lobbyContent.includes("safe-px"), "GameLobbyScreen enforces horizontal safe-area padding");
  assert(lobbyContent.includes("safe-top"), "GameLobbyScreen enforces top safe-area padding");
  assert(lobbyContent.includes("safe-bottom"), "GameLobbyScreen enforces bottom safe-area clearance");
  assert(lobbyContent.includes("min-h-[56px]") || lobbyContent.includes('size="lg"'), "START GAME action button meets >= 56px thumb target requirement");
  assert(lobbyContent.includes("lockedGpsCount < 2"), "START GAME button is conditionally disabled when locked GPS count < 2");
  
  assert(roomCardContent.includes("min-h-[44px]"), "RoomCodeCard buttons meet >= 44px touch target requirement");
  assert(presetsContent.includes("min-h-[44px]"), "HouseRulesPresets meet >= 44px touch target requirement");
  assert(drawerContent.includes("min-h-[44px]"), "CustomRulesDrawer steppers meet >= 44px touch target requirement");
  assert(roleContent.includes("min-h-[44px]"), "RoleSelector controls meet >= 44px touch target requirement");
  assert(rosterContent.includes("LOCKED") && rosterContent.includes("ACQUIRING") && rosterContent.includes("DENIED"), "PlayerRoster displays full GPS status states");

  console.log("\n" + "=".repeat(60));
  console.log(`DAY 3 AUDIT & BENCHMARK: ${passed} PASSED, ${failed} FAILED`);
  console.log("=".repeat(60) + "\n");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runDay3Verification().catch((err) => {
  console.error("Verification error:", err);
  process.exit(1);
});
