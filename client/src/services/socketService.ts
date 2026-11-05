import { io, Socket } from "socket.io-client";

function getSocketServerUrl(): string {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    // If on a tunnel (localtunnel, ngrok, cloudflare) or public URL, use same-origin proxy
    if (hostname.includes("loca.lt") || hostname.includes("ngrok") || hostname.includes("trycloudflare.com")) {
      return window.location.origin;
    }
    // If on local network IP (e.g. 192.168.0.107)
    if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1") {
      return `http://${hostname}:4000`;
    }
  }
  return process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || "http://localhost:4000";
}

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const serverUrl = getSocketServerUrl();
    socket = io(serverUrl, {
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

