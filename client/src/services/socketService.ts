import { io, Socket } from "socket.io-client";

const SOCKET_SERVER_URL =
  process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || "http://localhost:4000";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_SERVER_URL, {
      autoConnect: true,
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      console.log(`🔌 [Client Socket] Connected: ${socket?.id}`);
    });

    socket.on("disconnect", (reason) => {
      console.log(`🔌 [Client Socket] Disconnected: ${reason}`);
    });

    socket.on("connect_error", (error) => {
      console.warn("⚠️ [Client Socket] Connection error:", error.message);
    });
  }

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

