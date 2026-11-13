import {
  lerp,
  lerpLongitude,
  lerpAngle,
  lerpCoordinates,
} from "../client/src/lib/geoUtils";
import {
  MultiplayerLerpEngine,
  RemotePlayerPacket,
} from "../client/src/lib/MultiplayerLerpEngine";

let passedCount = 0;
let totalCount = 0;

function assert(condition: boolean, message: string): void {
  totalCount++;
  if (condition) {
    passedCount++;
    console.log(`  ✅ [PASS] ${message}`);
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runDay7Verification() {
  console.log("===============================================================================");
  console.log("    HIDERUSH — DAY 7: MULTI-PLAYER MARKER RENDERING & LERP GLIDING AUDIT       ");
  console.log("===============================================================================\n");

  // ============================================================================
  // TEST SUITE 1: MATHEMATICAL LINEAR INTERPOLATION (LERP)
  // ============================================================================
  console.log("📦 1. Linear Interpolation (LERP) Mathematical Foundation");
  {
    // Lerp scalar: A = 10, B = 20
    assert(lerp(10, 20, 0.0) === 10, "Lerp(10, 20, 0.0) equals 10 (start position)");
    assert(lerp(10, 20, 0.5) === 15, "Lerp(10, 20, 0.5) equals 15 (midpoint)");
    assert(lerp(10, 20, 1.0) === 20, "Lerp(10, 20, 1.0) equals 20 (target position)");
    assert(lerp(10, 20, -0.5) === 10, "Progress t < 0 is clamped to 0.0");
    assert(lerp(10, 20, 1.5) === 20, "Progress t > 1 is clamped to 1.0");

    // Coordinates lerp
    const [lng, lat] = lerpCoordinates([77.2090, 28.6139], [77.2092, 28.6141], 0.5);
    assert(Math.abs(lng - 77.2091) < 0.000001, "2D coordinates interpolate longitude correctly");
    assert(Math.abs(lat - 28.6140) < 0.000001, "2D coordinates interpolate latitude correctly");
  }

  // ============================================================================
  // TEST SUITE 2: ANTIMERIDIAN (+/- 180 DEGREE) LONGITUDE WRAPPING
  // ============================================================================
  console.log("\n📦 2. Longitude Boundary Wrapping (+/- 180 deg)");
  {
    // Point A at 179 deg, Point B at -179 deg (distance is only 2 deg across antimeridian)
    const midLng = lerpLongitude(179, -179, 0.5);
    assert(Math.abs(Math.abs(midLng) - 180) < 0.00001, "Interpolating across +179 to -179 passes through +/-180 boundary rather than wrapping around the globe");

    const quarterLng = lerpLongitude(179, -179, 0.25);
    assert(Math.abs(quarterLng - 179.5) < 0.00001, "Shortest longitude path is preserved");
  }

  // ============================================================================
  // TEST SUITE 3: SHORTEST-ARC ANGULAR HEADING INTERPOLATION
  // ============================================================================
  console.log("\n📦 3. Compass & Heading Angular Interpolation (Shortest Arc)");
  {
    // Heading from 350 deg (NNW) to 10 deg (NNE): shortest arc is +20 deg through 0/360
    const midAngle = lerpAngle(350, 10, 0.5);
    assert(Math.abs(midAngle - 0) < 0.00001 || Math.abs(midAngle - 360) < 0.00001, "Angle from 350 to 10 interpolates through 0/360 deg (North), not 180 deg");

    // Heading from 10 deg to 350 deg
    const midAngleReverse = lerpAngle(10, 350, 0.5);
    assert(Math.abs(midAngleReverse - 0) < 0.00001 || Math.abs(midAngleReverse - 360) < 0.00001, "Reverse angular shortest path works identically");

    // Standard rotation 90 deg to 180 deg
    const midEastSouth = lerpAngle(90, 180, 0.5);
    assert(Math.abs(midEastSouth - 135) < 0.00001, "Quarter-turn 90 to 180 interpolates smoothly to 135 deg");
  }

  // ============================================================================
  // TEST SUITE 4: 60 FPS LERP ENGINE ADVANCEMENT
  // ============================================================================
  console.log("\n📦 4. 60 FPS Multiplayer LERP Engine Motion Simulation");
  {
    const engine = new MultiplayerLerpEngine();

    // 1. Initial location packet for Player 1 (Runner) at time = 0ms
    const packet1: RemotePlayerPacket = {
      playerId: "runner_1",
      callsign: "ShadowDash",
      role: "RUNNER",
      lng: 77.209000,
      lat: 28.613900,
      heading: 0,
      timestamp: 1000,
    };
    engine.ingestPacket(packet1, 0);

    // Initial step at time 0
    const step0 = engine.step(0);
    assert(step0.features.length === 1, "Engine registers initial player in FeatureCollection");
    const p1_0 = step0.features[0];
    assert(Math.abs(p1_0.geometry.coordinates[0] - 77.209000) < 0.000001, "Initial player longitude matches packet exactly");
    assert(Math.abs(p1_0.geometry.coordinates[1] - 28.613900) < 0.000001, "Initial player latitude matches packet exactly");
    assert(p1_0.properties?.role === "RUNNER", "Player 1 has RUNNER role property");
    assert(p1_0.properties?.isRunner === true, "Player 1 has isRunner = true");

    // 2. Incoming update: Player moves ~5m North after 1000ms
    const packet2: RemotePlayerPacket = {
      playerId: "runner_1",
      callsign: "ShadowDash",
      role: "RUNNER",
      lng: 77.209000,
      lat: 28.613945, // ~5 meters North
      heading: 0,
      timestamp: 2000,
    };
    engine.ingestPacket(packet2, 0);

    // 3. Simulate 60 FPS frames:
    // Frame at t = 250ms (25% progress)
    const step25 = engine.step(250);
    const lat25 = step25.features[0].geometry.coordinates[1];
    assert(lat25 > 28.613900 && lat25 < 28.613945, "Frame at 25% progress has moved past start without reaching target");
    assert(Math.abs(lat25 - (28.613900 + 0.000045 * 0.25)) < 0.000002, "Frame at 25% matches mathematical LERP");

    // Frame at t = 500ms (50% progress)
    const step50 = engine.step(500);
    const lat50 = step50.features[0].geometry.coordinates[1];
    assert(Math.abs(lat50 - (28.613900 + 0.000045 * 0.5)) < 0.000002, "Frame at 50% smoothly reaches midpoint");

    // Frame at t = 1000ms (100% progress)
    const step100 = engine.step(1000);
    const lat100 = step100.features[0].geometry.coordinates[1];
    assert(Math.abs(lat100 - 28.613945) < 0.000001, "Frame at 100% arrives cleanly at target coordinates");

    // Frame after duration (t = 1200ms) remains smoothly at target position without jumping
    const stepOver = engine.step(1200);
    const latOver = stepOver.features[0].geometry.coordinates[1];
    assert(Math.abs(latOver - 28.613945) < 0.000001, "Position clamps cleanly at target coordinate when update finishes");
  }

  // ============================================================================
  // TEST SUITE 5: HUNTER & RUNNER MULTI-ROLE FEATURE SEPARATION
  // ============================================================================
  console.log("\n📦 5. Hunter & Runner Role Styling Separation");
  {
    const engine = new MultiplayerLerpEngine();

    // Hunter Player
    engine.ingestPacket({
      playerId: "hunter_1",
      callsign: "GrimReaper",
      role: "HUNTER",
      lng: 77.2090,
      lat: 28.6139,
      heading: 90,
      timestamp: 1000,
    });

    // Runner Player
    engine.ingestPacket({
      playerId: "runner_2",
      callsign: "NeonGhost",
      role: "RUNNER",
      lng: 77.2095,
      lat: 28.6142,
      heading: 270,
      timestamp: 1000,
    });

    const fc = engine.step(100);
    assert(fc.features.length === 2, "Both Hunter and Runner are tracked concurrently");

    const hunter = fc.features.find((f) => f.id === "hunter_1");
    const runner = fc.features.find((f) => f.id === "runner_2");

    assert(hunter?.properties?.role === "HUNTER", "Hunter feature has HUNTER role");
    assert(hunter?.properties?.isHunter === true, "Hunter feature has isHunter flag for Red styling");
    assert(hunter?.properties?.heading === 90, "Hunter feature preserves 90 deg heading");

    assert(runner?.properties?.role === "RUNNER", "Runner feature has RUNNER role");
    assert(runner?.properties?.isRunner === true, "Runner feature has isRunner flag for Cyan styling");
    assert(runner?.properties?.heading === 270, "Runner feature preserves 270 deg heading");
  }

  // ============================================================================
  // TEST SUITE 6: DYNAMIC ROLE SWITCH & REMOVAL
  // ============================================================================
  console.log("\n📦 6. Dynamic Role Transition & Player Removal");
  {
    const engine = new MultiplayerLerpEngine();

    engine.ingestPacket({
      playerId: "player_toggle",
      callsign: "Viper",
      role: "RUNNER",
      lng: 77.2090,
      lat: 28.6139,
      timestamp: 1000,
    });

    let fc = engine.step(50);
    assert(fc.features[0].properties?.role === "RUNNER", "Player begins as RUNNER");

    // Dynamic role update
    engine.updatePlayerRole("player_toggle", "HUNTER");
    fc = engine.step(60);
    assert(fc.features[0].properties?.role === "HUNTER", "Player updates to HUNTER role dynamically");

    // Player leaves room / disconnects
    engine.removePlayer("player_toggle");
    fc = engine.step(70);
    assert(fc.features.length === 0, "Disconnected player is removed immediately from map");
  }

  // ============================================================================
  // TEST SUITE 7: STALE PLAYER PRUNING (INACTIVITY TIMEOUT)
  // ============================================================================
  console.log("\n📦 7. Inactive / Stale Player Garbage Collection");
  {
    const engine = new MultiplayerLerpEngine();

    engine.ingestPacket({
      playerId: "ghost_player",
      callsign: "LostSignal",
      role: "RUNNER",
      lng: 77.2090,
      lat: 28.6139,
      timestamp: Date.now() - 20000, // 20 seconds ago
    });

    // Manually backdate lastSeenTime to simulate 16s timeout
    const tracked = engine.getPlayer("ghost_player");
    if (tracked) {
      tracked.lastSeenTime = Date.now() - 16000;
    }

    const fc = engine.step(100);
    assert(fc.features.length === 0, "Player inactive for > 15s is pruned automatically to avoid ghost markers");
  }

  console.log("\n===============================================================================");
  console.log(`  🎉 DAY 7 AUDIT COMPLETE: ${passedCount}/${totalCount} TEST ASSERTIONS PASSED!`);
  console.log("===============================================================================\n");
}

runDay7Verification().catch((err) => {
  console.error("Audit error:", err);
  process.exit(1);
});
