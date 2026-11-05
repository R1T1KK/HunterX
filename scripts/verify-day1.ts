import fs from "node:fs";
import path from "node:path";

function runVerification() {
  console.log("🔍 [VERIFICATION] Starting Day 1 Automated Quality & Mobile Audit...\n");

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

  // 1. PWA Manifest Audit
  console.log("📋 1. Auditing Web App Manifest...");
  const manifestPath = path.resolve("client/public/manifest.json");
  assert(fs.existsSync(manifestPath), "manifest.json exists in client/public");

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  assert(manifest.name === "HIDERUSH — Real-World GPS Tag", "Manifest has full application name");
  assert(manifest.short_name === "HIDERUSH", "Manifest has short_name");
  assert(manifest.display === "standalone", "Display mode is standalone");
  assert(manifest.orientation === "portrait", "Orientation locked to portrait");
  assert(manifest.theme_color === "#07090E", "Theme color is #07090E (Pure Black)");
  assert(manifest.background_color === "#07090E", "Background color is #07090E");
  assert(Array.isArray(manifest.icons) && manifest.icons.length >= 3, "Manifest defines at least 3 icons");

  // 2. Icon Verification
  console.log("\n🎨 2. Auditing PWA Application Icons...");
  for (const icon of manifest.icons) {
    const iconPath = path.resolve("client/public", icon.src.replace(/^\//, ""));
    assert(fs.existsSync(iconPath), `Icon exists at ${icon.src}`);
    const content = fs.readFileSync(iconPath, "utf-8");
    assert(content.includes("<svg"), `Icon ${icon.src} is a valid SVG document`);
  }

  // 3. Service Worker Audit
  console.log("\n📲 3. Auditing Service Worker...");
  const swPath = path.resolve("client/public/sw.js");
  assert(fs.existsSync(swPath), "sw.js exists in client/public");
  const swContent = fs.readFileSync(swPath, "utf-8");
  assert(swContent.includes("addEventListener(\"install\""), "Service worker has install listener");
  assert(swContent.includes("addEventListener(\"activate\""), "Service worker has activate listener");
  assert(swContent.includes("addEventListener(\"fetch\""), "Service worker has fetch interceptor");

  // 4. Safe-Area & Design System Audit
  console.log("\n🛡️ 4. Auditing Safe-Area Insets & Dark Gaming Design Tokens...");
  const cssPath = path.resolve("client/src/app/globals.css");
  assert(fs.existsSync(cssPath), "globals.css exists");
  const cssContent = fs.readFileSync(cssPath, "utf-8");
  assert(cssContent.includes("env(safe-area-inset-top"), "Safe-top CSS variable/rule configured");
  assert(cssContent.includes("env(safe-area-inset-bottom"), "Safe-bottom CSS variable/rule configured");
  assert(cssContent.includes("touch-action: manipulation"), "Touch-action manipulation configured (prevents double-tap zoom)");
  assert(cssContent.includes("overscroll-behavior-y: none"), "Overscroll bounce disabled");
  assert(cssContent.includes("#07090E"), "Pure black color token present");
  assert(cssContent.includes("#FF3B30"), "Crimson color token present");

  // 5. Backend Server Structure Audit
  console.log("\n⚙️ 5. Auditing Backend Express + Socket.IO Server...");
  const serverIndexPath = path.resolve("server/src/index.ts");
  assert(fs.existsSync(serverIndexPath), "server/src/index.ts exists");
  const serverIndexContent = fs.readFileSync(serverIndexPath, "utf-8");
  assert(serverIndexContent.includes("app.get(\"/health\""), "Health check endpoint registered");
  assert(serverIndexContent.includes("new SocketIOServer"), "Socket.IO server initialized");
  assert(serverIndexContent.includes("gracefulShutdown"), "Graceful shutdown handler implemented");

  const envConfigPath = path.resolve("server/src/config/env.ts");
  assert(fs.existsSync(envConfigPath), "Zod environment validator exists");
  const envConfigContent = fs.readFileSync(envConfigPath, "utf-8");
  assert(envConfigContent.includes("z.object("), "Zod schema defined for environment variables");

  // 6. Viewport Width Responsive Hierarchy Audit
  console.log("\n📱 6. Mobile Viewport Dimension Conformance (360px - 430px)...");
  const pagePath = path.resolve("client/src/app/page.tsx");
  const pageContent = fs.readFileSync(pagePath, "utf-8");
  assert(pageContent.includes("max-w-md") || pageContent.includes("max-w-xs"), "Mobile containment (max-w-md) enforced");
  assert(pageContent.includes("safe-px"), "Horizontal safe padding applied");
  assert(pageContent.includes("safe-top"), "Vertical top safe-area applied");
  assert(pageContent.includes("safe-bottom"), "Fixed bottom navigation handles safe-bottom");
  assert(pageContent.includes("min-h-[44px]") || pageContent.includes("min-h-[56px]"), "Touch targets meet >= 44px/56px requirement");

  console.log("\n" + "=".repeat(60));
  console.log(`TOTAL AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=".repeat(60) + "\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification();
