const { spawn } = require("child_process");

function startTunnel() {
  console.log("[Tunnel Supervisor] Starting localtunnel on port 3000 with subdomain 'hiderush-gps'...");

  const child = spawn("npx.cmd", ["--yes", "localtunnel", "--port", "3000", "--subdomain", "hiderush-gps"], {
    stdio: "inherit",
    shell: true,
  });

  child.on("close", (code) => {
    console.log(`[Tunnel Supervisor] Localtunnel process exited with code ${code}. Reconnecting in 2s...`);
    setTimeout(startTunnel, 2000);
  });

  child.on("error", (err) => {
    console.error("[Tunnel Supervisor] Error running tunnel:", err.message);
    setTimeout(startTunnel, 2000);
  });
}

startTunnel();

