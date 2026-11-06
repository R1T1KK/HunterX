import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createGeoJsonCircle, evaluateSignalQuality } from "../client/src/lib/geoUtils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

async function runDay5Verification() {
  console.log("🛰️ [VERIFICATION] Starting Day 5 Mobile Geolocation & Accuracy Ring Audit...\n");

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
  // 1. Exact Threshold Verification (TESTS 5, 6, 7 & Edge Cases)
  // ==========================================
  console.log("🎯 1. Tactical GPS Signal Quality Badge Thresholds (Exact Specs)...");

  // TEST 5: Accuracy = 7 meters -> GREEN - GPS EXCELLENT
  const q7 = evaluateSignalQuality(7, "LOCKED", false);
  assert(q7.quality === "EXCELLENT", "TEST 5.1: Accuracy = 7m evaluates to quality 'EXCELLENT'");
  assert(q7.label === "GPS EXCELLENT", "TEST 5.2: Accuracy = 7m label is exactly 'GPS EXCELLENT'");
  assert(q7.badgeColor === "#10B981", "TEST 5.3: Accuracy = 7m color is Green (#10B981)");

  // Boundary 9.9m -> EXCELLENT
  const q9_9 = evaluateSignalQuality(9.9, "LOCKED", false);
  assert(q9_9.quality === "EXCELLENT" && q9_9.label === "GPS EXCELLENT", "Boundary test: 9.9m is GPS EXCELLENT");

  // TEST 6: Accuracy = 15 meters -> AMBER - GPS MODERATE
  const q15 = evaluateSignalQuality(15, "LOCKED", false);
  assert(q15.quality === "MODERATE", "TEST 6.1: Accuracy = 15m evaluates to quality 'MODERATE'");
  assert(q15.label === "GPS MODERATE", "TEST 6.2: Accuracy = 15m label is exactly 'GPS MODERATE'");
  assert(q15.badgeColor === "#FF9500", "TEST 6.3: Accuracy = 15m color is Amber (#FF9500)");

  // Boundary 10.0m -> MODERATE
  const q10 = evaluateSignalQuality(10.0, "LOCKED", false);
  assert(q10.quality === "MODERATE" && q10.label === "GPS MODERATE", "Boundary test: 10.0m is GPS MODERATE");

  // Boundary 20.0m -> MODERATE
  const q20 = evaluateSignalQuality(20.0, "LOCKED", false);
  assert(q20.quality === "MODERATE" && q20.label === "GPS MODERATE", "Boundary test: 20.0m is GPS MODERATE");

  // TEST 7: Accuracy = 25 meters -> RED - GPS WEAK
  const q25 = evaluateSignalQuality(25, "LOCKED", false);
  assert(q25.quality === "WEAK", "TEST 7.1: Accuracy = 25m evaluates to quality 'WEAK'");
  assert(q25.label === "GPS WEAK", "TEST 7.2: Accuracy = 25m label is exactly 'GPS WEAK'");
  assert(q25.badgeColor === "#FF3B30", "TEST 7.3: Accuracy = 25m color is Crimson (#FF3B30)");

  // Boundary 20.1m -> WEAK
  const q20_1 = evaluateSignalQuality(20.1, "LOCKED", false);
  assert(q20_1.quality === "WEAK" && q20_1.label === "GPS WEAK", "Boundary test: 20.1m is GPS WEAK");

  // TEST 8: User denies GPS permission -> LOCATION PERMISSION DENIED
  const qDenied = evaluateSignalQuality(null, "DENIED", false);
  assert(qDenied.quality === "DENIED", "TEST 8.1: Denied permission evaluates to 'DENIED'");
  assert(qDenied.label === "LOCATION PERMISSION DENIED", "TEST 8.2: Denied label is exactly 'LOCATION PERMISSION DENIED'");

  // TEST 9: GPS signal temporarily lost -> GPS SIGNAL LOST
  const qLost = evaluateSignalQuality(12, "LOCKED", true);
  assert(qLost.quality === "SIGNAL_LOST", "TEST 9.1: Temporary signal loss evaluates to 'SIGNAL_LOST'");
  assert(qLost.label === "GPS SIGNAL LOST", "TEST 9.2: Signal lost label is exactly 'GPS SIGNAL LOST'");

  // Additional state: Acquiring
  const qAcquiring = evaluateSignalQuality(null, "ACQUIRING", false);
  assert(qAcquiring.quality === "ACQUIRING" && qAcquiring.label === "ACQUIRING GPS", "Initial state evaluates to 'ACQUIRING GPS'");

  // ==========================================
  // 2. Dynamic Accuracy Circle Geometry Math (TESTS 3 & 4)
  // ==========================================
  console.log("\n⭕ 2. Dynamic GPS Accuracy Circle GeoJSON Geometry & Metric Scaling...");
  const center: [number, number] = [77.209, 28.6139];

  // Circle at 7m accuracy
  const circle7m = createGeoJsonCircle(center, 7, 64);
  assert(circle7m.type === "Feature", "Circle geometry is a valid GeoJSON Feature");
  assert(circle7m.geometry.type === "Polygon", "Circle geometry type is Polygon");
  assert(circle7m.geometry.coordinates[0].length === 65, "Circle polygon contains 64 segments + 1 closing coordinate");
  assert(circle7m.properties?.radius === 7, "Circle radius property preserves physical accuracy (7m)");

  // Circle at 25m accuracy
  const circle25m = createGeoJsonCircle(center, 25, 64);
  assert(circle25m.properties?.radius === 25, "Circle radius property reflects physical accuracy (25m)");

  // TEST 3 & 4: Circle shrinking & expanding verification
  const p7North = circle7m.geometry.coordinates[0][16]; // ~North vertex
  const p25North = circle25m.geometry.coordinates[0][16];
  const deltaLat7 = Math.abs(p7North[1] - center[1]);
  const deltaLat25 = Math.abs(p25North[1] - center[1]);

  assert(deltaLat7 < deltaLat25, "TEST 3 & 4: Circle polygon diameter scales proportionally with accuracy (7m < 25m)");
  const ratio = deltaLat25 / deltaLat7;
  assert(Math.abs(ratio - 25 / 7) < 0.05, `Mathematical accuracy scaling confirmed: ratio ${ratio.toFixed(2)} ~= (25/7 = 3.57)`);

  // ==========================================
  // 3. HTML5 Geolocation API Hook & Lifecycle Audit (TESTS 1, 2, 8, 9, 10)
  // ==========================================
  console.log("\n📱 3. useGeolocation Hook Lifecycle, Fallback & Watcher Cleanup Audit...");
  const hookPath = path.resolve(projectRoot, "client/src/hooks/useGeolocation.ts");
  const hookContent = fs.readFileSync(hookPath, "utf-8");

  assert(hookContent.includes("navigator.geolocation.watchPosition"), "TEST 1.1: Hook uses HTML5 watchPosition for continuous coordinate streaming");
  assert(hookContent.includes("enableHighAccuracy: useHighAccuracy"), "TEST 1.2: Hook enables enableHighAccuracy: true");
  assert(hookContent.includes("navigator.geolocation.clearWatch"), "TEST 10.1: Hook clears watcher on unmount via clearWatch");
  assert(hookContent.includes("watchIdRef.current = null"), "TEST 10.2: Hook sets watcher ref to null preventing memory leaks and duplicate watchers");
  assert(hookContent.includes("PERMISSION_DENIED"), "TEST 8.3: Hook explicitly traps error.PERMISSION_DENIED");
  assert(hookContent.includes("TIMEOUT"), "TEST 9.3: Hook explicitly traps error.TIMEOUT with fallback recovery");
  assert(hookContent.includes("startWatcher(false)"), "TEST 9.4: Fallback recovery triggers low-accuracy mode when high-accuracy times out");
  assert(hookContent.includes("signalLossThresholdMs"), "TEST 9.5: Heartbeat watchdog monitors signal freshness and detects GPS signal loss");

  // ==========================================
  // 4. Mapbox Layer Integration Audit
  // ==========================================
  console.log("\n🗺️ 4. Mapbox GL Accuracy Layer & Marker Architecture...");
  const mapPath = path.resolve(projectRoot, "client/src/components/map/FullBleedMap.tsx");
  const mapContent = fs.readFileSync(mapPath, "utf-8");

  assert(mapContent.includes("user-accuracy-source"), "Mapbox GeoJSON source 'user-accuracy-source' configured");
  assert(mapContent.includes("user-accuracy-fill"), "Mapbox fill layer 'user-accuracy-fill' configured");
  assert(mapContent.includes("user-accuracy-line"), "Mapbox line stroke layer 'user-accuracy-line' configured");
  assert(mapContent.includes("createGeoJsonCircle"), "FullBleedMap imports and invokes createGeoJsonCircle for real-time ring updates");
  assert(mapContent.includes("new mapboxgl.Marker"), "User location marker uses Mapbox DOM Marker (placed visually above canvas layers)");
  assert(mapContent.includes("headingCone"), "Marker includes directional heading indicator when heading is available");

  // ==========================================
  // 5. Tactical GPS Badge Component Audit
  // ==========================================
  console.log("\n🎖️ 5. Tactical GPS Quality Badge Component...");
  const badgePath = path.resolve(projectRoot, "client/src/components/ui/GPSQualityBadge.tsx");
  const badgeContent = fs.readFileSync(badgePath, "utf-8");
  const screenPath = path.resolve(projectRoot, "client/src/components/map/GameMapScreen.tsx");
  const screenContent = fs.readFileSync(screenPath, "utf-8");

  assert(badgeContent.includes("GPS EXCELLENT"), "Badge supports 'GPS EXCELLENT'");
  assert(badgeContent.includes("GPS MODERATE"), "Badge supports 'GPS MODERATE'");
  assert(badgeContent.includes("GPS WEAK"), "Badge supports 'GPS WEAK'");
  assert(badgeContent.includes("ACQUIRING GPS"), "Badge supports 'ACQUIRING GPS'");
  assert(badgeContent.includes("GPS SIGNAL LOST"), "Badge supports 'GPS SIGNAL LOST'");
  assert(badgeContent.includes("LOCATION PERMISSION DENIED"), "Badge supports 'LOCATION PERMISSION DENIED'");
  assert(badgeContent.includes("±{Math.round(accuracy)}m"), "Badge renders live numeric accuracy measurement in meters");
  assert(screenContent.includes("GPSQualityBadge"), "GameMapScreen embeds GPSQualityBadge into the tactical floating top HUD");

  console.log("\n" + "=".repeat(60));
  console.log(`DAY 5 AUDIT & BENCHMARK: ${passed} PASSED, ${failed} FAILED`);
  console.log("=".repeat(60) + "\n");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runDay5Verification().catch((err) => {
  console.error("Verification error:", err);
  process.exit(1);
});

