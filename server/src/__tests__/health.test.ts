import { describe, it, expect } from "vitest";
import { app } from "../index.js";
import http from "node:http";

describe("Backend Health Endpoint", () => {
  it("should respond with 200 OK and valid health payload", async () => {
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as { port: number }).port;

    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.status).toBe("ok");
      expect(json.service).toBe("hiderush-server");
      expect(typeof json.uptime).toBe("number");
      expect(typeof json.timestamp).toBe("string");
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it("should return 404 for unknown routes", async () => {
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as { port: number }).port;

    try {
      const response = await fetch(`http://127.0.0.1:${port}/unknown-route`);
      expect(response.status).toBe(404);

      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("NOT_FOUND");
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
