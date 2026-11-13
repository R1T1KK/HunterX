/**
 * HIDERUSH — Day 9 Automated Acceptance Audit
 * Verifies Server-Authoritative Role Assignment Engine,
 * Cryptographic Random Selection (crypto.randomInt),
 * Authorized Manual Assignment, Preset Handler & Validation (Quick, Standard, Big Park, Custom),
 * Socket.IO role:assigned Distribution, and Role Tampering Security.
 */

import http from "http";
import { Server as SocketIOServer } from "../server/node_modules/socket.io/dist/index.js";
import { io as ClientIO, Socket as ClientSocket } from "../server/node_modules/socket.io-client/build/cjs/index.js";
import { registerRoomHandlers } from "../server/src/socket/roomGateway.js";
import { roomManager } from "../server/src/services/RoomManager.js";
import { gameManager } from "../server/src/services/GameManager.js";
import { RoleAssignmentEngine } from "../server/src/services/RoleAssignmentEngine.js";
import { PresetHandler } from "../server/src/services/PresetHandler.js";
import { RoleAssignedPayload } from "../server/src/types/index.js";

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

async function runDay9Verification() {
  console.log("\n=======================================================");
  console.log("🎭 HIDERUSH DAY 9: ROLE ASSIGNMENT & PRESET HANDLER AUDIT");
  console.log("=======================================================\n");

  roomManager.resetAll();
  gameManager.resetAll();

  const httpServer = http.createServer();
  const io = new SocketIOServer(httpServer, { cors: { origin: "*" } });

  io.on("connection", (socket) => {
    registerRoomHandlers(io, socket);
  });

  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  const port = (httpServer.address() as any).port;
  const serverUrl = `http://localhost:${port}`;

  console.log(`[Test Server] Running on ${serverUrl}`);

  // SECTION 1: Hunter Allocation Engine (1, 2, or 3 Hunters)
  console.log("\n--- Section 1: Hunter Allocation Options ---");

  const room4p = roomManager.createRoom({
    hostPlayerId: "h1",
    callsign: "Host1",
    socketId: "s1",
  });
  for (let i = 2; i <= 4; i++) {
    roomManager.joinRoom({ roomCode: room4p.roomCode, playerId: `p${i}`, callsign: `Player${i}`, socketId: `s${i}` });
  }

  // 1 Hunter
  roomManager.updateRoleSettings(room4p.roomCode, "h1", { hunterCount: 1, mode: "RANDOM" });
  const res1 = RoleAssignmentEngine.assignRandomRoles(room4p);
  assert(res1.hunterCount === 1, "1 Hunter allocation correctly produces 1 Hunter");
  assert(res1.runnerCount === 3, "Remaining 3 players automatically assigned as Runners");
  assert(room4p.players.every((p) => p.role === "HUNTER" || p.role === "RUNNER"), "All players receive exactly one role");

  // 2 Hunters
  const room5p = roomManager.createRoom({ hostPlayerId: "h1b", callsign: "Host1b", socketId: "s1b" });
  for (let i = 2; i <= 5; i++) {
    roomManager.joinRoom({ roomCode: room5p.roomCode, playerId: `p5_${i}`, callsign: `Player5_${i}`, socketId: `s5_${i}` });
  }
  roomManager.updateRoleSettings(room5p.roomCode, "h1b", { hunterCount: 2, mode: "RANDOM" });
  const res2 = RoleAssignmentEngine.assignRandomRoles(room5p);
  assert(res2.hunterCount === 2, "2 Hunters allocation correctly produces 2 Hunters");
  assert(res2.runnerCount === 3, "Remaining 3 players automatically assigned as Runners");

  // 3 Hunters
  const room6p = roomManager.createRoom({ hostPlayerId: "h1c", callsign: "Host1c", socketId: "s1c" });
  for (let i = 2; i <= 6; i++) {
    roomManager.joinRoom({ roomCode: room6p.roomCode, playerId: `p6_${i}`, callsign: `Player6_${i}`, socketId: `s6_${i}` });
  }
  roomManager.updateRoleSettings(room6p.roomCode, "h1c", { hunterCount: 3, mode: "RANDOM" });
  const res3 = RoleAssignmentEngine.assignRandomRoles(room6p);
  assert(res3.hunterCount === 3, "3 Hunters allocation correctly produces 3 Hunters");
  assert(res3.runnerCount === 3, "Remaining 3 players automatically assigned as Runners");

  // SECTION 2: Cryptographic Random Assignment Security
  console.log("\n--- Section 2: Cryptographic Random Assignment ---");

  let threw0 = false;
  try { RoleAssignmentEngine.validateHunterCount(0, 4); } catch { threw0 = true; }
  assert(threw0, "Rejects invalid Hunter count = 0");

  let threw4 = false;
  try { RoleAssignmentEngine.validateHunterCount(4, 5); } catch { threw4 = true; }
  assert(threw4, "Rejects invalid Hunter count = 4 (Maximum is 3)");

  let threwOver = false;
  try { RoleAssignmentEngine.validateHunterCount(3, 3); } catch { threwOver = true; }
  assert(threwOver, "Rejects Hunter count >= total players (requires at least 1 Runner)");

  // Test cryptographic shuffle preservation
  const testDeck = ["A", "B", "C", "D", "E", "F"];
  const shuffled = RoleAssignmentEngine.secureShuffle(testDeck);
  assert(shuffled.length === 6 && new Set(shuffled).size === 6, "crypto.randomInt shuffle preserves all elements without duplication");

  // SECTION 3: Authorized Manual Role Assignment
  console.log("\n--- Section 3: Authorized Manual Assignment ---");

  const roomManual = roomManager.createRoom({ hostPlayerId: "admin_host", callsign: "HostAdmin", socketId: "s_admin" });
  roomManager.joinRoom({ roomCode: roomManual.roomCode, playerId: "runner_bob", callsign: "Bob", socketId: "s_bob" });
  roomManager.joinRoom({ roomCode: roomManual.roomCode, playerId: "runner_charlie", callsign: "Charlie", socketId: "s_charlie" });

  // Host assigns Charlie as Hunter
  const manualResult = RoleAssignmentEngine.assignManualRoles(roomManual, "admin_host", ["runner_charlie"]);
  assert(manualResult.hunterCount === 1, "Manual assignment sets exactly 1 Hunter");
  const charlie = roomManual.players.find((p) => p.playerId === "runner_charlie");
  const bob = roomManual.players.find((p) => p.playerId === "runner_bob");
  const host = roomManual.players.find((p) => p.playerId === "admin_host");
  assert(charlie?.role === "HUNTER", "Target player 'runner_charlie' assigned HUNTER");
  assert(bob?.role === "RUNNER" && host?.role === "RUNNER", "Other players assigned RUNNER");

  // Non-host manual assignment rejected
  let threwNotHost = false;
  try { RoleAssignmentEngine.assignManualRoles(roomManual, "runner_bob", ["runner_bob"]); } catch { threwNotHost = true; }
  assert(threwNotHost, "Non-host player cannot manually assign roles (rejected with NOT_HOST)");

  // Duplicate ID manual assignment rejected
  let threwDup = false;
  try { RoleAssignmentEngine.assignManualRoles(roomManual, "admin_host", ["runner_bob", "runner_bob"]); } catch { threwDup = true; }
  assert(threwDup, "Duplicate player IDs in manual assignment rejected");

  // SECTION 4: Game Preset Handler & Strict Boundary Validation
  console.log("\n--- Section 4: Game Preset Handler & Boundary Validation ---");

  const quickRules = PresetHandler.validateAndApply(roomManual.rules, { preset: "QUICK" });
  assert(quickRules.preset === "QUICK", "Quick preset applied");
  assert(quickRules.roundLengthMinutes === 5, "Quick preset has 5-minute round");
  assert(quickRules.headStartSeconds === 15, "Quick preset has 15s head start");
  assert(quickRules.pingIntervalSeconds === 30, "Quick preset has 30s ping");
  assert(quickRules.zoneSizeMeters === 200, "Quick preset has 200m zone");

  const standardRules = PresetHandler.validateAndApply(roomManual.rules, { preset: "STANDARD" });
  assert(standardRules.preset === "STANDARD", "Standard preset applied");
  assert(standardRules.roundLengthMinutes === 10, "Standard preset has 10-minute round");
  assert(standardRules.headStartSeconds === 30, "Standard preset has 30s head start");
  assert(standardRules.zoneSizeMeters === 500, "Standard preset has 500m zone");

  const bigParkRules = PresetHandler.validateAndApply(roomManual.rules, { preset: "BIG_PARK" });
  assert(bigParkRules.preset === "BIG_PARK", "Big Park preset applied");
  assert(bigParkRules.roundLengthMinutes === 20, "Big Park has 20-minute round");
  assert(bigParkRules.zoneShrinks === true, "Big Park has zone shrinking enabled");

  // Validation rejections
  let threwInvalidDuration = false;
  try { PresetHandler.validateAndApply(roomManual.rules, { preset: "CUSTOM", roundLengthMinutes: 1 }); } catch { threwInvalidDuration = true; }
  assert(threwInvalidDuration, "Rejects out-of-bounds round duration (< 3 minutes)");

  let threwInvalidPing = false;
  try { PresetHandler.validateAndApply(roomManual.rules, { preset: "CUSTOM", pingIntervalSeconds: 5 }); } catch { threwInvalidPing = true; }
  assert(threwInvalidPing, "Rejects out-of-bounds ping interval (< 15 seconds)");

  let threwInvalidZone = false;
  try { PresetHandler.validateAndApply(roomManual.rules, { preset: "CUSTOM", zoneSizeMeters: 50 }); } catch { threwInvalidZone = true; }
  assert(threwInvalidZone, "Rejects out-of-bounds zone size (< 100 meters)");

  // SECTION 5: Socket.IO Role Distribution & Client Tampering Security
  console.log("\n--- Section 5: Socket.IO role:assigned & Security ---");

  const client1 = ClientIO(serverUrl, { transports: ["websocket"] });
  const client2 = ClientIO(serverUrl, { transports: ["websocket"] });

  await Promise.all([
    new Promise((resolve) => client1.on("connect", resolve)),
    new Promise((resolve) => client2.on("connect", resolve)),
  ]);

  const liveRoom = roomManager.createRoom({ hostPlayerId: "live_h1", callsign: "LiveHost", socketId: client1.id! });
  roomManager.joinRoom({ roomCode: liveRoom.roomCode, playerId: "live_p2", callsign: "LivePeer", socketId: client2.id! });
  roomManager.updatePlayerGPSStatus(liveRoom.roomCode, "live_h1", "LOCKED");
  roomManager.updatePlayerGPSStatus(liveRoom.roomCode, "live_p2", "LOCKED");

  // Test Role Tampering Prevention
  const tamperErrorPromise = new Promise<{ code: string }>((resolve) => {
    client2.once("room:error", resolve);
  });
  client2.emit("role:change", { role: "HUNTER" });
  const tamperError = await tamperErrorPromise;
  assert(
    tamperError.code === "UNAUTHORIZED_ROLE_MUTATION",
    "Client-side role tampering over Socket.IO blocked with UNAUTHORIZED_ROLE_MUTATION"
  );

  // Test role:assigned private distribution
  const rolePromise1 = new Promise<RoleAssignedPayload>((resolve) => client1.once("role:assigned", resolve));
  const rolePromise2 = new Promise<RoleAssignedPayload>((resolve) => client2.once("role:assigned", resolve));

  gameManager.startMatch(io, liveRoom.roomCode, "live_h1");

  const [roleAssigned1, roleAssigned2] = await Promise.all([rolePromise1, rolePromise2]);

  assert(roleAssigned1.playerId === "live_h1", "Client 1 received verified role:assigned for self");
  assert(roleAssigned2.playerId === "live_p2", "Client 2 received verified role:assigned for self");
  assert(["HUNTER", "RUNNER"].includes(roleAssigned1.role), "Client 1 assigned valid role");
  assert(["HUNTER", "RUNNER"].includes(roleAssigned2.role), "Client 2 assigned valid role");
  assert(roleAssigned1.role !== roleAssigned2.role, "Mutual role exclusivity enforced (1 Hunter, 1 Runner)");

  // SECTION 6: Day 8 Integration & Full Lifecycle
  console.log("\n--- Section 6: Day 8 Integration ---");

  const matchSession = gameManager.getMatch(liveRoom.roomCode);
  assert(matchSession?.gameState === "COUNTDOWN", "Match transitioned to COUNTDOWN after role assignment");
  assert(matchSession?.headStartDurationSeconds === 30, "Day 8 30-second Head-Start Countdown active");

  // Teardown
  client1.disconnect();
  client2.disconnect();
  gameManager.resetAll();
  httpServer.close();

  console.log("\n=======================================================");
  const passedCount = results.filter((r) => r.passed).length;
  console.log(`Day 9 Audit Summary: ${passedCount}/${results.length} tests passed.`);
  console.log("=======================================================\n");

  if (passedCount < results.length) {
    process.exit(1);
  }
}

runDay9Verification().catch((err) => {
  console.error("FATAL Day 9 Verification Error:", err);
  process.exit(1);
});
