import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "node:http";
import { io as ClientSocket, Socket as ClientSocketType } from "socket.io-client";
import { app, io as ServerIO } from "../index.js";
import { Room } from "../types/index.js";

describe("Socket.IO Real-Time Multiplayer Room Gateway", () => {
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

  it("should support Device 1 creating a room and Device 2 joining with real-time synchronization", async () => {
    const serverUrl = `http://127.0.0.1:${serverPort}`;

    // Connect Device 1
    client1 = ClientSocket(serverUrl, { transports: ["websocket"] });
    await new Promise<void>((resolve) => client1.on("connect", resolve));

    // Device 1 creates room
    const createStartTime = performance.now();
    const createResponse = await new Promise<{ room: Room }>((resolve) => {
      client1.emit(
        "room:create",
        { playerId: "user-alpha", callsign: "AlphaHunter" },
        (res: { success: boolean; data: { room: Room } }) => {
          resolve(res.data);
        }
      );
    });
    const createDuration = performance.now() - createStartTime;

    expect(createDuration).toBeLessThan(200); // Benchmark: < 200ms
    expect(createResponse.room.roomCode).toMatch(/^[A-Z0-9]{6}$/);
    expect(createResponse.room.players).toHaveLength(1);
    expect(createResponse.room.players[0].callsign).toBe("AlphaHunter");
    expect(createResponse.room.players[0].isHost).toBe(true);

    const roomCode = createResponse.room.roomCode;

    // Connect Device 2
    client2 = ClientSocket(serverUrl, { transports: ["websocket"] });
    await new Promise<void>((resolve) => client2.on("connect", resolve));

    // Prepare listeners for synchronization
    const device1PlayerJoinedPromise = new Promise<{ player: { callsign: string }; room: Room }>(
      (resolve) => {
        client1.on("room:player-joined", resolve);
      }
    );

    const device2JoinPromise = new Promise<{ room: Room }>((resolve) => {
      client2.emit(
        "room:join",
        { roomCode, playerId: "user-beta", callsign: "BetaRunner" },
        (res: { success: boolean; data: { room: Room } }) => {
          resolve(res.data);
        }
      );
    });

    const joinStartTime = performance.now();
    const [device1Event, device2Response] = await Promise.all([
      device1PlayerJoinedPromise,
      device2JoinPromise,
    ]);
    const joinDuration = performance.now() - joinStartTime;

    expect(joinDuration).toBeLessThan(200); // Benchmark: < 200ms
    expect(device2Response.room.players).toHaveLength(2);
    expect(device1Event.player.callsign).toBe("BetaRunner");
    expect(device1Event.room.players).toHaveLength(2);

    // Verify player leaving triggers synchronization
    const playerLeftPromise = new Promise<{ playerId: string; room: Room }>((resolve) => {
      client1.on("room:player-left", resolve);
    });

    client2.emit("room:leave", { roomCode, playerId: "user-beta" });
    const leaveEvent = await playerLeftPromise;

    expect(leaveEvent.playerId).toBe("user-beta");
    expect(leaveEvent.room.players).toHaveLength(1);
  });

  it("should emit room:error when trying to join with an invalid room code", async () => {
    const errorPromise = new Promise<{ code: string; message: string }>((resolve) => {
      client1.once("room:error", resolve);
    });

    client1.emit("room:join", {
      roomCode: "BAD999",
      playerId: "user-test",
      callsign: "TestPlayer",
    });

    const error = await errorPromise;
    expect(error.code).toBe("ROOM_NOT_FOUND");
  });
});

