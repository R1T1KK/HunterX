import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "node:http";
import { io as ClientSocket, Socket as ClientSocketType } from "socket.io-client";
import { app, io as ServerIO } from "../index.js";
import { Room } from "../types/index.js";

describe("Socket.IO Real-Time Multiplayer Day 3 Integration", () => {
  let server: http.Server;
  let serverPort: number;
  let client1: ClientSocketType;
  let client2: ClientSocketType;

  beforeAll(async () => {
    server = http.createServer(app);
    ServerIO.attach(server);

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        serverPort = (server.address() as { port: number }).port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (client1?.connected) client1.disconnect();
    if (client2?.connected) client2.disconnect();
    ServerIO.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("should handle full Day 3 real-time synchronization between Host and Runner", async () => {
    const serverUrl = `http://127.0.0.1:${serverPort}`;

    // 1. Connect Device 1 (Host)
    client1 = ClientSocket(serverUrl, { transports: ["websocket"] });
    await new Promise<void>((resolve) => client1.on("connect", resolve));

    const createRes = await new Promise<{ room: Room }>((resolve) => {
      client1.emit(
        "room:create",
        { playerId: "host-user", callsign: "HostAlpha" },
        (res: { success: boolean; data: { room: Room } }) => resolve(res.data)
      );
    });
    let roomCode = createRes.room.roomCode;
    expect(createRes.room.rules.preset).toBe("STANDARD");

    // 2. Connect Device 2 (Runner)
    client2 = ClientSocket(serverUrl, { transports: ["websocket"] });
    await new Promise<void>((resolve) => client2.on("connect", resolve));

    const joinRes = await new Promise<{ room: Room }>((resolve) => {
      client2.emit(
        "room:join",
        { roomCode, playerId: "runner-user", callsign: "RunnerBeta" },
        (res: { success: boolean; data: { room: Room } }) => resolve(res.data)
      );
    });
    expect(joinRes.room.players).toHaveLength(2);

    // 3. Host changes preset QUICK -> Device 2 receives updated preset
    const presetQuickPromise = new Promise<{ rules: { preset: string } }>((resolve) => {
      client2.once("room:settings-updated", resolve);
    });
    client1.emit("room:update-rules", {
      roomCode,
      requesterPlayerId: "host-user",
      rules: { preset: "QUICK" },
    });
    const quickUpdate = await presetQuickPromise;
    expect(quickUpdate.rules.preset).toBe("QUICK");

    // 4. Host changes preset BIG_PARK -> Device 2 receives updated settings
    const presetBigParkPromise = new Promise<{ rules: { preset: string; zoneShrinks: boolean } }>((resolve) => {
      client2.once("room:settings-updated", resolve);
    });
    client1.emit("room:update-rules", {
      roomCode,
      requesterPlayerId: "host-user",
      rules: { preset: "BIG_PARK" },
    });
    const bigParkUpdate = await presetBigParkPromise;
    expect(bigParkUpdate.rules.preset).toBe("BIG_PARK");
    expect(bigParkUpdate.rules.zoneShrinks).toBe(true);

    // 5. Host changes Hunter count from 1 to 2
    const rolePromise = new Promise<{ roleSettings: { hunterCount: number } }>((resolve) => {
      client2.once("room:role-settings-updated", resolve);
    });
    client1.emit("room:update-role-settings", {
      roomCode,
      requesterPlayerId: "host-user",
      roleSettings: { hunterCount: 2, mode: "RANDOM" },
    });
    const roleUpdate = await rolePromise;
    expect(roleUpdate.roleSettings.hunterCount).toBe(2);

    // 6. Device 2 changes Ready status -> Host receives update
    const readyPromise = new Promise<{ playerId: string; isReady: boolean }>((resolve) => {
      client1.once("room:player-ready-updated", resolve);
    });
    client2.emit("room:update-ready", {
      roomCode,
      playerId: "runner-user",
      isReady: true,
    });
    const readyUpdate = await readyPromise;
    expect(readyUpdate.playerId).toBe("runner-user");
    expect(readyUpdate.isReady).toBe(true);

    // 7. GPS lock status update -> Broadcast to all
    const gpsPromise = new Promise<{ playerId: string; gpsStatus: string }>((resolve) => {
      client2.once("room:gps-status-updated", resolve);
    });
    client1.emit("room:update-gps-status", {
      roomCode,
      playerId: "host-user",
      gpsStatus: "LOCKED",
    });
    const gpsUpdate = await gpsPromise;
    expect(gpsUpdate.gpsStatus).toBe("LOCKED");

    // 8. Start Game rejection when fewer than 2 GPS locks
    const errorPromise = new Promise<{ code: string }>((resolve) => {
      client1.once("room:error", resolve);
    });
    client1.emit("room:start-game", {
      roomCode,
      requesterPlayerId: "host-user",
    });
    const error = await errorPromise;
    expect(error.code).toBe("CANNOT_START_GAME");

    // 9. Host regenerates room code -> Both devices receive new code
    const regenPromise1 = new Promise<{ oldCode: string; newCode: string }>((resolve) => {
      client1.once("room:code-regenerated", resolve);
    });
    const regenPromise2 = new Promise<{ oldCode: string; newCode: string }>((resolve) => {
      client2.once("room:code-regenerated", resolve);
    });
    client1.emit("room:regenerate-code", {
      oldCode: roomCode,
      requesterPlayerId: "host-user",
    });
    const [regen1, regen2] = await Promise.all([regenPromise1, regenPromise2]);
    expect(regen1.newCode).toBe(regen2.newCode);
    expect(regen1.newCode).not.toBe(roomCode);
    expect(regen1.newCode).toHaveLength(6);
    roomCode = regen1.newCode;

    // 10. Device 2 confirms GPS lock -> Now 2 GPS locks exist!
    client2.emit("room:update-gps-status", {
      roomCode,
      playerId: "runner-user",
      gpsStatus: "LOCKED",
    });

    // Wait a tick for GPS state to settle
    await new Promise((r) => setTimeout(r, 50));

    // 11. Host starts game successfully -> Both receive room:game-started
    const startPromise1 = new Promise<{ room: { status: string } }>((resolve) => {
      client1.once("room:game-started", resolve);
    });
    const startPromise2 = new Promise<{ room: { status: string } }>((resolve) => {
      client2.once("room:game-started", resolve);
    });

    client1.emit("room:start-game", {
      roomCode,
      requesterPlayerId: "host-user",
    });

    const [gameStart1, gameStart2] = await Promise.all([startPromise1, startPromise2]);
    expect(gameStart1.room.status).toBe("STARTING");
    expect(gameStart2.room.status).toBe("STARTING");
  });
});
