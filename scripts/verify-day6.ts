import { GpsSmoother } from "../client/src/lib/GpsSmoother";
import { calculateHaversineDistance } from "../client/src/lib/geoUtils";
import { LocationManager } from "../server/src/services/LocationManager";
import { RoomManager } from "../server/src/services/RoomManager";
import { LocationUpdatePayload } from "../client/src/types";

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

async function runDay6Verification() {
  console.log("===============================================================================");
  console.log("       HIDERUSH — DAY 6: EMA GPS SMOOTHING & 1HZ STREAMING AUDIT               ");
  console.log("===============================================================================\n");

  // ============================================================================
  // TEST SUITE 1: EMA FILTER INITIALIZATION
  // ============================================================================
  console.log("📦 1. EMA Filter Initialization");
  {
    const filter = new GpsSmoother({ alpha: 0.25 });
    const initial = filter.process({
      lat: 28.6139,
      lng: 77.2090,
      accuracy: 6.0,
      timestamp: 1000,
    });

    assert(initial.accepted, "First valid coordinate is accepted");
    assert(initial.smoothedLat === 28.6139, "First smoothedLat matches rawLat exactly (S_0 = X_0)");
    assert(initial.smoothedLng === 77.2090, "First smoothedLng matches rawLng exactly");
    assert(initial.accuracy === 6.0, "First accuracy matches rawAccuracy");
    assert(!initial.isSmoothed, "Initial reading marked as non-smoothed base");
  }

  // ============================================================================
  // TEST SUITE 2: STATIONARY JITTER SUPPRESSION (STANDING STILL OUTDOORS)
  // ============================================================================
  console.log("\n📦 2. Stationary Jitter Suppression (Standing Still Test)");
  {
    const filter = new GpsSmoother({ alpha: 0.25 });
    const centerLat = 28.613900;
    const centerLng = 77.209000;

    // Simulate 20 noisy GPS readings oscillating around the center (1-3 meters jitter)
    const rawDeviations: number[] = [];
    const smoothedDeviations: number[] = [];

    // Initialize
    filter.process({ lat: centerLat, lng: centerLng, accuracy: 5.0, timestamp: 1000 });

    for (let i = 1; i <= 20; i++) {
      // Jitter +/- 0.000025 degrees (~2.5 meters)
      const noise = (Math.sin(i * 1.7) * 0.000025);
      const rawLat = centerLat + noise;
      const rawLng = centerLng + (Math.cos(i * 1.3) * 0.000025);

      const rawDist = calculateHaversineDistance([centerLng, centerLat], [rawLng, rawLat]);
      rawDeviations.push(rawDist);

      const res = filter.process({
        lat: rawLat,
        lng: rawLng,
        accuracy: 5.0,
        timestamp: 1000 + i * 1000,
      });

      const smoothedDist = calculateHaversineDistance([centerLng, centerLat], [res.smoothedLng, res.smoothedLat]);
      smoothedDeviations.push(smoothedDist);
    }

    const avgRawDev = rawDeviations.reduce((a, b) => a + b, 0) / rawDeviations.length;
    const avgSmoothedDev = smoothedDeviations.reduce((a, b) => a + b, 0) / smoothedDeviations.length;
    const varianceReduction = ((avgRawDev - avgSmoothedDev) / avgRawDev) * 100;

    console.log(`     Average raw jitter displacement: ${avgRawDev.toFixed(2)}m`);
    console.log(`     Average smoothed displacement:   ${avgSmoothedDev.toFixed(2)}m`);
    console.log(`     Stationary jitter reduction:    ${varianceReduction.toFixed(1)}%`);

    assert(avgSmoothedDev < avgRawDev, "Smoothed displacement is strictly lower than raw jitter");
    assert(varianceReduction >= 50.0, "Jitter suppression eliminates >= 50% of erratic drift when stationary");
  }

  // ============================================================================
  // TEST SUITE 3: RESPONSIVE WALKING MOVEMENT
  // ============================================================================
  console.log("\n📦 3. Walking Responsiveness (Preserving Real Movement)");
  {
    const filter = new GpsSmoother({ alpha: 0.25 });
    const startLat = 28.613900;
    const startLng = 77.209000;

    // Simulate walking North at 1.4 m/s for 10 seconds (~0.0000126 deg/s)
    let curLat = startLat;
    let lastSmoothed = { lat: startLat, lng: startLng };

    for (let t = 0; t <= 10; t++) {
      const res = filter.process({
        lat: curLat,
        lng: startLng,
        accuracy: 4.5,
        speed: 1.4,
        timestamp: 1000 + t * 1000,
      });

      lastSmoothed = { lat: res.smoothedLat, lng: res.smoothedLng };
      curLat += 0.0000126; // ~1.4 meters north
    }

    const totalWalkDist = calculateHaversineDistance([startLng, startLat], [startLng, curLat - 0.0000126]);
    const smoothedWalkDist = calculateHaversineDistance([startLng, startLat], [lastSmoothed.lng, lastSmoothed.lat]);
    const lagMeters = totalWalkDist - smoothedWalkDist;

    console.log(`     Walked distance:    ${totalWalkDist.toFixed(1)}m`);
    console.log(`     Smoothed distance:  ${smoothedWalkDist.toFixed(1)}m`);
    console.log(`     Tracking lag:       ${lagMeters.toFixed(1)}m (< 4.5m expected)`);

    assert(smoothedWalkDist > 10.0, "Filter preserves forward progression during walking");
    assert(lagMeters < 5.0, "Movement tracking lag remains under 5 meters");
  }

  // ============================================================================
  // TEST SUITE 4: ACCURACY > 25M REJECTION
  // ============================================================================
  console.log("\n📦 4. GPS Accuracy Rejection (Rule: Accuracy > 25m Discarded)");
  {
    const filter = new GpsSmoother({ alpha: 0.25, maxAllowedAccuracyMeters: 25.0 });

    // Initial good reading
    filter.process({ lat: 28.6139, lng: 77.2090, accuracy: 8.0, timestamp: 1000 });

    // Degraded reading (accuracy = 25.5m)
    const degraded1 = filter.process({
      lat: 28.6145,
      lng: 77.2090,
      accuracy: 25.5,
      timestamp: 2000,
    });
    assert(!degraded1.accepted, "Reading with accuracy = 25.5m is REJECTED");
    assert(degraded1.rejectionReason === "LOW_ACCURACY", "Rejection reason is LOW_ACCURACY");
    assert(degraded1.smoothedLat === 28.6139, "State maintains previous coordinates; rejected reading excluded from EMA");

    // Degraded reading (accuracy = 40m)
    const degraded2 = filter.process({
      lat: 28.6150,
      lng: 77.2090,
      accuracy: 40.0,
      timestamp: 3000,
    });
    assert(!degraded2.accepted, "Reading with accuracy = 40.0m is REJECTED");

    // Valid reading arrives again (accuracy = 12m)
    const recovered = filter.process({
      lat: 28.61392,
      lng: 77.20901,
      accuracy: 12.0,
      timestamp: 4000,
    });
    assert(recovered.accepted, "Valid reading (accuracy = 12m) is ACCEPTED after degraded signals");
  }

  // ============================================================================
  // TEST SUITE 5: IMPLAUSIBLE JUMP REJECTION (TELEPORTATION SPIKES)
  // ============================================================================
  console.log("\n📦 5. Implausible Jump Rejection");
  {
    const filter = new GpsSmoother({ alpha: 0.25, maxPlausibleSpeedMps: 12.0 });

    filter.process({ lat: 28.6139, lng: 77.2090, accuracy: 5.0, timestamp: 1000 });

    // 500 meters jump in 1 second (500 m/s >> 12 m/s)
    const spike = filter.process({
      lat: 28.6184, // ~500m away
      lng: 77.2090,
      accuracy: 5.0,
      timestamp: 2000,
    });

    assert(!spike.accepted, "500m coordinate jump in 1 second is REJECTED");
    assert(spike.rejectionReason === "IMPLAUSIBLE_JUMP", "Rejection reason is IMPLAUSIBLE_JUMP");
    assert(spike.smoothedLat === 28.6139, "EMA state completely ignores the teleportation spike");
  }

  // ============================================================================
  // TEST SUITE 6: PLAUSIBLE MOVEMENT ACCEPTANCE
  // ============================================================================
  console.log("\n📦 6. Plausible Movement Acceptance");
  {
    const filter = new GpsSmoother({ alpha: 0.25, maxPlausibleSpeedMps: 12.0 });

    filter.process({ lat: 28.61390, lng: 77.20900, accuracy: 5.0, timestamp: 1000 });

    // 3.5 meters movement in 1 second (3.5 m/s < 12 m/s sprint ceiling)
    const plausible = filter.process({
      lat: 28.61393,
      lng: 77.20900,
      accuracy: 5.0,
      timestamp: 2000,
    });

    assert(plausible.accepted, "Realistic sprint displacement (3.5m in 1s) is ACCEPTED");
  }

  // ============================================================================
  // TEST SUITE 7: NETWORK PAYLOAD SIZE OPTIMIZATION (<= 1536 BYTES)
  // ============================================================================
  console.log("\n📦 7. Network Payload Size Optimization");
  {
    const samplePayload: LocationUpdatePayload = {
      roomCode: "HUNT8X",
      playerId: "usr_948f2190a4",
      lat: 28.613912,
      lng: 77.209015,
      accuracy: 8.4,
      heading: 182.5,
      speed: 2.1,
      timestamp: Date.now(),
    };

    const jsonString = JSON.stringify(samplePayload);
    const byteLength = Buffer.byteLength(jsonString, "utf8");

    console.log(`     Sample payload size: ${byteLength} bytes (Max: 1536 bytes)`);
    assert(byteLength <= 1536, "Payload size is strictly <= 1536 bytes (1.5 KB)");
    assert(byteLength < 300, "Compact payload is well under 300 bytes (cellular friendly)");
  }

  // ============================================================================
  // TEST SUITE 8: SERVER-SIDE VALIDATION & 1HZ RATE LIMITING
  // ============================================================================
  console.log("\n📦 8. Server-Side Rate Limiting & Validation");
  {
    const locManager = new LocationManager();
    const { roomManager } = await import("../server/src/services/RoomManager");

    const room = roomManager.createRoom({
      hostPlayerId: "player_audit",
      callsign: "Shadow",
      socketId: "sock_123",
    });

    const validPayload: LocationUpdatePayload = {
      roomCode: room.roomCode,
      playerId: "player_audit",
      lat: 28.6139,
      lng: 77.2090,
      accuracy: 7.0,
      timestamp: Date.now(),
    };

    // 1st update
    const res1 = locManager.processLocationUpdate(validPayload, "sock_123");
    if (!res1.success) {
      console.error("res1 error:", res1.error);
    }
    assert(res1.success, "Server accepts valid first location update");

    // Immediate 2nd update (rapid flood)
    const res2 = locManager.processLocationUpdate(
      { ...validPayload, lat: 28.61391 },
      "sock_123"
    );
    assert(!res2.success, "Server drops rapid burst update");
    assert(res2.error?.code === "RATE_LIMITED", "Server reports RATE_LIMITED error code");

    // Oversized payload
    const oversized = { ...validPayload, junk: "a".repeat(2000) };
    const res3 = locManager.processLocationUpdate(oversized, "sock_123");
    assert(!res3.success && res3.error?.code === "PAYLOAD_TOO_LARGE", "Server rejects payload > 1536B");
  }

  // ============================================================================
  // TEST SUITE 9: RESET & RECONNECTION CLEANUP
  // ============================================================================
  console.log("\n📦 9. Session Reset & State Recovery");
  {
    const filter = new GpsSmoother({ alpha: 0.25 });
    filter.process({ lat: 28.6139, lng: 77.2090, accuracy: 5.0, timestamp: 1000 });

    // Reset session
    filter.reset();

    // New reading at a different city (e.g. 19.0760 Mumbai)
    const newSession = filter.process({
      lat: 19.0760,
      lng: 72.8777,
      accuracy: 6.0,
      timestamp: 5000,
    });

    assert(newSession.accepted, "After reset, new reading in different location is accepted as S_0");
    assert(newSession.smoothedLat === 19.0760, "SmoothedLat matches new base exactly after reset");
  }

  console.log("\n===============================================================================");
  console.log(`  🎉 DAY 6 AUDIT COMPLETE: ${passedCount}/${totalCount} TEST ASSERTIONS PASSED!`);
  console.log("===============================================================================\n");
}

runDay6Verification().catch((err) => {
  console.error("Audit error:", err);
  process.exit(1);
});
