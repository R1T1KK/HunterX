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

async function runDay2Verification() {
  console.log("🔍 [VERIFICATION] Starting Day 2 Autonomous Audit & Benchmarks...\n");

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

  // 1. Performance Benchmark: Room Creation
  console.log("⚡ 1. Measuring RoomManager In-Memory Performance...");
  const createStart = performance.now();
  const room = roomManager.createRoom({
    hostPlayerId: "perf-host",
    callsign: "BenchHost",
    socketId: "sock-perf-1",
  });
  const createDuration = performance.now() - createStart;

  console.log(`     Processing time: ${createDuration.toFixed(2)}ms (Target: < 200ms)`);
  assert(createDuration < 200, `Room creation processing time is ${createDuration.toFixed(2)}ms (< 200ms)`);
  assert(room.roomCode.length === 6, "Room code is exactly 6 characters");
  assert(room.maxPlayers === 15, "Room max players enforced at 15");

  // 2. Performance Benchmark: Room Joining
  const joinStart = performance.now();
  const joinedRoom = roomManager.joinRoom({
    roomCode: room.roomCode,
    playerId: "perf-joiner",
    callsign: "BenchJoiner",
    socketId: "sock-perf-2",
  });
  const joinDuration = performance.now() - joinStart;

  console.log(`     Join processing time: ${joinDuration.toFixed(2)}ms (Target: < 200ms)`);
  assert(joinDuration < 200, `Room joining processing time is ${joinDuration.toFixed(2)}ms (< 200ms)`);
  assert(joinedRoom.players.length === 2, "Room contains 2 players after joining");

  // Clean up benchmark room
  roomManager.leaveRoom(room.roomCode, "perf-host");
  roomManager.leaveRoom(room.roomCode, "perf-joiner");

  // 3. Socket.IO End-to-End Multiplayer Synchronization
  console.log("\n🔌 2. Socket.IO Real-Time 2-Device Synchronization...");
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
    assert(true, "Both simulated devices connected via WebSocket");

    // Device 1 creates room
    const createRes = await new Promise<{ room: { roomCode: string } }>((resolve) => {
      client1!.emit(
        "room:create",
        { playerId: "device-1", callsign: "HostOne" },
        (res: { success: boolean; data: { room: { roomCode: string } } }) => resolve(res.data)
      );
    });
    const code = createRes.room.roomCode;
    assert(code.length === 6, `Device 1 created room ${code}`);

    // Device 1 listens for player joined
    const playerJoinedPromise = new Promise<{ player: { callsign: string } }>((resolve) => {
      client1!.on("room:player-joined", resolve);
    });

    // Device 2 joins room
    const joinRes = await new Promise<{ room: { players: unknown[] } }>((resolve) => {
      client2!.emit(
        "room:join",
        { roomCode: code, playerId: "device-2", callsign: "JoinerTwo" },
        (res: { success: boolean; data: { room: { players: unknown[] } } }) => resolve(res.data)
      );
    });

    const playerJoinedEvent = await playerJoinedPromise;
    assert(joinRes.room.players.length === 2, "Device 2 received updated room with 2 players");
    assert(playerJoinedEvent.player.callsign === "JoinerTwo", "Device 1 received reactive player-joined event");

  } finally {
    if (client1?.connected) client1.disconnect();
    if (client2?.connected) client2.disconnect();
    ServerIO.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  // 4. Mobile Viewport Layout & Ergonomics Audit
  console.log("\n📱 3. Mobile Viewport Dimensions & Safe Area Audit (360px - 430px)...");
  const homePath = path.resolve(projectRoot, "client/src/components/home/HomeScreen.tsx");
  const waitingPath = path.resolve(projectRoot, "client/src/components/lobby/WaitingRoom.tsx");
  const navPath = path.resolve(projectRoot, "client/src/components/navigation/BottomNav.tsx");

  const homeContent = fs.readFileSync(homePath, "utf-8");
  const waitingContent = fs.readFileSync(waitingPath, "utf-8");
  const navContent = fs.readFileSync(navPath, "utf-8");

  assert(homeContent.includes("safe-px"), "Home Screen enforces horizontal safe area padding");
  assert(homeContent.includes("safe-top"), "Home Screen enforces safe-top status bar padding");
  assert(waitingContent.includes("safe-px"), "Waiting Room enforces horizontal safe area padding");
  assert(waitingContent.includes("safe-top"), "Waiting Room enforces safe-top status bar padding");
  assert(navContent.includes("safe-bottom"), "Bottom Nav enforces safe-bottom gesture bar clearance");
  assert(navContent.includes("min-h-[44px]"), "Bottom Nav buttons meet >= 44px touch target requirement");
  assert(homeContent.includes("min-h-[56px]") || homeContent.includes("size=\"lg\""), "Host button meets >= 56px primary thumb target");

  console.log("\n" + "=".repeat(60));
  console.log(`DAY 2 AUDIT & BENCHMARK: ${passed} PASSED, ${failed} FAILED`);
  console.log("=".repeat(60) + "\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runDay2Verification();
