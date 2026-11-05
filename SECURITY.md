# SECURITY.md — Anti-Cheat, Game Integrity & Security Architecture

> **Security Policy Version:** 1.0.0  
> **Status:** APPROVED SECURITY SPECIFICATION  

---

## 1. Threat Modeling Overview

HIDERUSH operates in an adversarial environment where players physically compete. Because the game runs inside consumer mobile web browsers, clients have full access to DevTools, JavaScript execution contexts, and operating system mock-location settings.

Our architecture assumes: **The client is completely untrusted.**

---

## 2. Server-Authoritative Game Logic (Anti-Tampering)

### 2.1 The Principle of Blind Clients
Clients are rendering and sensor interfaces only. No game-critical calculation is decided on the client:
- **Role Assignment:** Calculated exclusively on the server. Clients cannot declare themselves Hunters or Hiders.
- **Match Clock:** The master clock ticks on the Node.js server. Client timers simply interpolate against server timestamps.
- **Ability Cooldowns:** The server records the `cooldownUntil` timestamp in memory. If a client attempts to trigger Invisibility before $180\text{ seconds}$ have elapsed, the request is rejected with a `COOLDOWN_ACTIVE` error.
- **Catch Validation:** A Hunter cannot claim "I caught player X". The Hunter only submits "I attempt to tag player X". The server verifies the authoritative distance between both players before issuing an elimination event.

### 2.2 Packet Sanitization (Anti-Wallhack / Sniffing)
In traditional client-side games, hiding an opponent's marker in the UI is trivial to defeat by inspecting the WebSocket incoming payload.
- In HIDERUSH, **Packet Sanitization happens at the network layer**:
  - When Hider $H_1$ activates Invisibility, the server's spatial loop physically removes $H_1$'s coordinates from the JSON packet sent to Hunter sockets.
  - Even if a Hunter attaches a packet proxy (e.g., Charles or Wireshark), the invisible Hider's coordinates are physically absent from the wire.

---

## 3. Realities & Limitations of Browser GPS Security

> [!WARNING]  
> **Engineering Reality:** It is cryptographically and technically **impossible** to guarantee 100% spoof-proof GPS in a standard mobile web browser. 
> Operating systems (Android Developer Options "Mock Locations", jailbroken iOS, or browser DevTools GPS overrides) supply coordinates directly into the browser's `navigator.geolocation` API. The browser cannot inspect the hardware baseband chip directly.

### 3.1 Defense-in-Depth GPS Heuristics
Rather than claiming false invulnerability, HIDERUSH employs heuristic defense layers:
1. **Speed & Teleportation Sanity Check:**
   - Maximum human sprint speed under outdoor game conditions is $\approx 10\text{ m/s}$ ($36\text{ km/h}$).
   - The server maintains the last validated position and timestamp $(P_{t-1}, t-1)$.
   - When receiving update $(P_t, t)$, the server calculates:
     $$v = \frac{\text{Distance}(P_{t-1}, P_t)}{t - (t-1)}$$
   - If $v > 12.0\text{ m/s}$, the update is flagged as anomalous. If anomalies persist across 3 consecutive ticks, the player is warned or isolated.
2. **Accuracy Circle Filtering:**
   - Any coordinate report with reported accuracy $> 25\text{ meters}$ is discarded from distance checks to avoid erratic drift triggering false catches.
3. **Plausibility & Stationary Jitter Verification:**
   - Real GPS receivers exhibit slight micro-noise (0.5–2m random drift) even when standing still due to atmospheric interference. Injections of mathematically identical coordinates over multiple minutes are flagged.

---

## 4. Catch Distance Security & Tolerances

Catching is a core point of dispute in real-world games.
- **Threshold Setting:** $\le 5.0\text{ meters}$.
- **Margin of Error Calculation:**
  Civilian mobile GPS typical accuracy in clear sky is $\approx 3–5\text{ meters}$. If two players stand right next to each other, their reported coordinates may indicate a 2–4 meter separation.
- Setting the threshold to $5.0\text{ meters}$ ensures legitimate physical tags are validated without requiring players to literally touch phones, while preventing catches across streets or buildings.

---

## 5. Room & Network Security

### 5.1 Room Code Brute-Force Protection
- Room codes are 6 alphanumeric characters chosen from a 32-character unambiguous charset (`23456789ABCDEFGHJKLMNPQRSTUVWXYZ`), yielding:
  $$32^6 = 1,073,741,824 \text{ possible combinations}$$
- **Rate Limiting:** IP addresses attempting more than 10 invalid room join attempts per minute are temporarily throttled for 15 minutes.

### 5.2 Capacity Enforcement
- The backend strictly enforces a hard limit of **15 active connections per room**. Additional connection attempts receive `ROOM_FULL` and are disconnected.

### 5.3 WebSocket Throttling & Payload Size Clamping
- Inbound `location:update` events are rate-limited to **1 event per second per socket**. Excess events are dropped silently.
- Payloads exceeding $1\text{ KB}$ are rejected to prevent memory exhaustion attacks.

---

## 6. Database & Secret Security

- **Supabase Service Role Key:** Kept strictly inside server environment variables (`server/.env`). Never committed to source control or exposed to Next.js client bundles.
- **Next.js Client Keys:** Only public anon keys (`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_MAPBOX_TOKEN`) with domain-restricted origins are exposed to the browser.
- **Row Level Security (RLS):** All tables have RLS enabled by default to prevent direct database tampering even if client anon keys are extracted.

