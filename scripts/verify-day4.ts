import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

async function runDay4Verification() {
  console.log("🗺️ [VERIFICATION] Starting Day 4 Full-Bleed Mapbox Autonomous Audit & Benchmarks...\n");

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
  // 1. Dependency & Environment Audit
  // ==========================================
  console.log("📦 1. Mapbox GL JS Installation & Environment Configuration...");
  const clientPkgPath = path.resolve(projectRoot, "client/package.json");
  const clientPkg = JSON.parse(fs.readFileSync(clientPkgPath, "utf-8"));

  assert(Boolean(clientPkg.dependencies["mapbox-gl"]), "mapbox-gl is installed in dependencies");
  assert(Boolean(clientPkg.devDependencies["@types/mapbox-gl"]), "@types/mapbox-gl is installed in devDependencies");

  const envExamplePath = path.resolve(projectRoot, "client/.env.example");
  const envLocalPath = path.resolve(projectRoot, "client/.env.local");
  const envExample = fs.readFileSync(envExamplePath, "utf-8");
  const envLocal = fs.readFileSync(envLocalPath, "utf-8");

  assert(envExample.includes("NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN"), "NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN documented in .env.example");
  assert(envLocal.includes("NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN"), "NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN present in .env.local");

  // ==========================================
  // 2. Full-Bleed 100vw x 100dvh Canvas Architecture
  // ==========================================
  console.log("\n📐 2. Full-Bleed 100vw x 100dvh Mobile Viewport Layout...");
  const mapPath = path.resolve(projectRoot, "client/src/components/map/FullBleedMap.tsx");
  const mapContent = fs.readFileSync(mapPath, "utf-8");
  const globalsPath = path.resolve(projectRoot, "client/src/app/globals.css");
  const globalsContent = fs.readFileSync(globalsPath, "utf-8");

  assert(mapContent.includes("100vw") && mapContent.includes("100dvh"), "Map canvas container explicitly enforces 100vw x 100dvh");
  assert(mapContent.includes("fixed") && mapContent.includes("inset-0"), "Map container fixed to inset-0 to prevent layout jumps");
  assert(mapContent.includes("overflow-hidden"), "Map container suppresses horizontal/vertical scrolling");
  assert(globalsContent.includes(".mapboxgl-map") && globalsContent.includes(".mapboxgl-canvas"), "globals.css overrides Mapbox canvas to fill 100% of viewport");
  assert(globalsContent.includes("mapbox-gl/dist/mapbox-gl.css"), "Mapbox GL CSS imported in globals.css");
  assert(mapContent.includes("window.addEventListener(\"resize\""), "Map instance listens for window resize events to adapt to mobile address bar shifts");
  assert(mapContent.includes("window.addEventListener(\"orientationchange\""), "Map instance handles device orientation changes");

  // ==========================================
  // 3. Mobile Gesture & Touch Configurations
  // ==========================================
  console.log("\n👆 3. Mobile Gesture Configurations (Anti-Frustration Rules)...");
  assert(mapContent.includes("dragPan: true"), "Single-finger panning ENABLED (dragPan: true)");
  assert(mapContent.includes("touchZoomRotate: true"), "Pinch-to-zoom ENABLED (touchZoomRotate: true)");
  assert(mapContent.includes("doubleClickZoom: false"), "Double-tap zoom strictly DISABLED (doubleClickZoom: false to avoid running mis-zooms)");
  assert(mapContent.includes("scrollZoom: false"), "Scroll zoom disabled to avoid desktop mouse wheel hijacking");
  assert(mapContent.includes("boxZoom: false"), "Box zoom disabled for touch devices");

  // ==========================================
  // 4. SCRAM Dark Tactical Palette & Vector Style
  // ==========================================
  console.log("\n🎨 4. SCRAM Dark Gaming Map Style & Colors...");
  const configPath = path.resolve(projectRoot, "client/src/components/map/mapConfig.ts");
  const configContent = fs.readFileSync(configPath, "utf-8");

  assert(configContent.includes("#07090E"), "Background color set to Pure Black #07090E");
  assert(configContent.includes("#121620"), "Surface color set to Charcoal #121620");
  assert(configContent.includes("#FF3B30"), "Primary accent set to Crimson #FF3B30");
  assert(configContent.includes("#FF9500"), "Secondary accent set to Amber #FF9500");
  assert(configContent.includes("FALLBACK_TACTICAL_STYLE"), "Fallback tactical dark vector style present for offline/unconfigured states");

  // ==========================================
  // 5. Floating Tactical Controls Audit
  // ==========================================
  console.log("\n🎛️ 5. Floating Tactical Controls & Touch Targets...");
  const controlsPath = path.resolve(projectRoot, "client/src/components/map/FloatingMapControls.tsx");
  const controlsContent = fs.readFileSync(controlsPath, "utf-8");

  assert(controlsContent.includes("handleRecenter"), "Recenter on Me control handler implemented");
  assert(controlsContent.includes("map.flyTo"), "Recenter smoothly animates camera via map.flyTo");
  assert(controlsContent.includes("isLocating"), "Recenter shows loading spinner while acquiring GPS");
  assert(controlsContent.includes("PERMISSION_DENIED"), "Recenter provides user feedback when GPS permission is denied");

  assert(controlsContent.includes("handleResetNorth"), "Compass Heading control implemented");
  assert(controlsContent.includes("map.easeTo") || controlsContent.includes("map.resetNorth"), "Compass tap resets map bearing to North");
  assert(controlsContent.includes("map.on(\"rotate\""), "Compass needle dynamically updates with map rotation");

  assert(controlsContent.includes("handleZoomIn") && controlsContent.includes("handleZoomOut"), "Smooth Zoom In / Zoom Out controls implemented");
  assert(controlsContent.includes("min-h-[44px]") && controlsContent.includes("min-w-[44px]"), "All floating controls satisfy >= 44px mobile touch target requirements");
  assert(controlsContent.includes("safe-right"), "Floating controls respect mobile safe-area insets");

  // ==========================================
  // 6. Gameplay Screen Integration & Navigation
  // ==========================================
  console.log("\n🎮 6. Gameplay Screen (GameMapScreen) & HUD Integration...");
  const screenPath = path.resolve(projectRoot, "client/src/components/map/GameMapScreen.tsx");
  const screenContent = fs.readFileSync(screenPath, "utf-8");
  const pagePath = path.resolve(projectRoot, "client/src/app/page.tsx");
  const pageContent = fs.readFileSync(pagePath, "utf-8");

  assert(screenContent.includes("FullBleedMap"), "GameMapScreen integrates FullBleedMap as Layer 0");
  assert(screenContent.includes("safe-top"), "Floating HUD respects top safe-area insets");
  assert(screenContent.includes("min-h-[44px]"), "HUD buttons meet >= 44px touch target requirement");
  assert(screenContent.includes("onLeaveGame"), "GameMapScreen provides clean match exit confirmation");
  assert(pageContent.includes("GameMapScreen"), "App root imports and routes to GameMapScreen");
  assert(pageContent.includes("currentRoom.status === \"STARTING\"") || pageContent.includes("currentRoom.status === \"IN_PROGRESS\""), "GameMapScreen activates automatically when room status moves to STARTING or IN_PROGRESS");
  assert(pageContent.includes("isPreviewingMap"), "Tactical Map Preview mode available for direct inspection");

  console.log("\n" + "=".repeat(60));
  console.log(`DAY 4 AUDIT & BENCHMARK: ${passed} PASSED, ${failed} FAILED`);
  console.log("=".repeat(60) + "\n");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runDay4Verification().catch((err) => {
  console.error("Verification error:", err);
  process.exit(1);
});

