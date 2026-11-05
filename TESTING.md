# TESTING.md — Mobile-First Verification & QA Matrix

> **Target Standard:** 100% Critical Path Coverage & Zero Desktop Bias  
> **Mandatory Quality Gate:** Physical Mobile Device Testing is REQUIRED for all milestones. Desktop browser emulation alone is NOT sufficient for sign-off.  
> **Status:** APPROVED QA STRATEGY  

---

## 1. Quality Assurance Philosophy: Mobile Verification Gate

Because HIDERUSH is a mobile GPS game, desktop emulation inside browser DevTools cannot replicate:
1. Real cellular network handoffs (5G to LTE transitions outdoors).
2. Physical touch ergonomics in thumb zones while moving.
3. Mobile hardware thermal throttling, battery drain, and GPU tile rendering.
4. Native Web API quirks (`navigator.wakeLock`, iOS Safari AudioContext gesture restrictions, Android `navigator.vibrate`).
5. Hardware GPS multipath jitter and atmospheric drift.

**Rule:** No frontend milestone or core mechanic may be marked `COMPLETED` without verification on at least one physical iPhone (iOS Safari) and one physical Android smartphone (Mobile Chrome).

---

## 2. Mobile Device Testing Matrix

| Category | Target Devices / Environments | Acceptance Criteria |
| :--- | :--- | :--- |
| **iOS Testing** | iPhone 12 / 13 / 14 / 15 / 16 (iOS 16+ Safari) | - Dynamic Island & Notch safe-area insets respected.<br>- Full-bleed 100dvh map with zero address bar jumping.<br>- Web Audio siren plays on proximity alert.<br>- Zero horizontal scroll or elastic pull-to-refresh. |
| **Android Testing**| Samsung Galaxy / Google Pixel / OnePlus (Android Chrome 100+) | - System navigation bar safe-area insets respected.<br>- Device haptic vibration triggers on 10m alarm pulse.<br>- Screen Wake Lock maintains full display brightness.<br>- PWA "Add to Home Screen" installs cleanly. |
| **Touch Ergonomics**| Handheld one-handed thumb interaction | - All interactive buttons have $\ge 44\text{px} \times 44\text{px}$ touch targets.<br>- Primary thumb action buttons (Tag, Cloak) have $\ge 56\text{px}$ touch targets.<br>- No accidental triggering while running. |
| **Performance**| Mid-tier hardware (Snapdragon 7-series / A13 Bionic) | - 60 FPS continuous Mapbox vector panning.<br>- Zero React re-render lag during 1Hz GPS socket updates.<br>- Battery consumption $< 15\%$ over a 20-minute match. |

---

## 3. Test Suites by Screen & Feature

### 3.1 Screen 1: Home Screen
- **TC-HOM-01:** Verify hero branding, callsign input, and avatar preview render within safe bounds on both notched iPhones and hole-punch Android phones.
- **TC-HOM-02:** Verify tapping "Host a Game" instantly instantiates a room and transitions to Lobby in $< 200\text{ms}$.
- **TC-HOM-03:** Verify entering a 6-character room code joins the room smoothly.
- **TC-HOM-04:** Verify bottom navigation tabs (Play, Stats, Rules, Profile) switch views with instant response and zero page reload.

### 3.2 Screen 2: Game Lobby & House Rules Presets
- **TC-LOB-01:** Verify 1-tap "Copy Link" copies valid room URL to mobile clipboard with feedback toast.
- **TC-LOB-02:** Verify switching presets (**Quick**, **Standard**, **Big Park**) updates round length, head start, and zone shrinking interval across all connected devices in real time.
- **TC-LOB-03:** Verify Hunter count toggle (1, 2, or 3) and assignment mode (Manual vs. Random).
- **TC-LOB-04:** Verify "START GAME" fixed button remains disabled until at least 2 players have confirmed GPS locks.

### 3.3 Screen 3: Gameplay Screen & Tactical Map HUD
- **TC-MAP-01 (Full-Bleed Canvas):** Mapbox canvas fills $100\text{vw} \times 100\text{dvh}$ with zero white margins or browser overflow.
- **TC-MAP-02 (Head-Start Overlay):** 30s countdown locks Hunter screen with darkened overlay and displays pulsing green scatter message on Runner screens.
- **TC-MAP-03 (Dynamic Play Zone):** Circular geofence renders on map; if zone shrinking is enabled, circle smoothly contracts over time; walking outside triggers hazard warning banner.
- **TC-MAP-04 (Hunter 10m Alarm):** Approaching within $10\text{m}$ of a Runner triggers 10s audio siren and vibration on Hunter phone; Runner phone displays zero alert.
- **TC-MAP-05 (Runner Invisibility):** Tapping "INVISIBILITY CLOAK" removes Runner marker from Hunter map for exactly 15 seconds; 3-minute cooldown radial functions correctly.
- **TC-MAP-06 (Thumb-Zone Tag):** Hunter presses "TAG RUNNER" within $5\text{m}$; server validates catch, transitions Runner to Spectator, and updates score.

### 3.4 Screen 4 & 5: Profile & Results
- **TC-PRF-01:** Callsign changes persist in local storage and reflect in lobbies.
- **TC-RES-01:** Victory/defeat cinematic banners display correct winning team and match telemetry breakdown.

---

## 4. Multi-Client Simulation Test Harness

Using a headless Node.js script (`scripts/simulate-match.ts`), spawn simulated players connecting via Socket.IO:
- **Test Scenarios:**
  - **2 Players:** 1 Hunter, 1 Runner (minimum viable match).
  - **5 Players:** 1 Hunter, 4 Runners (standard group match).
  - **10 Players:** 2 Hunters, 8 Runners (mid-size match).
  - **15 Players:** 3 Hunters, 12 Runners (maximum capacity load test).
- **Load Criteria:** 15 simulated sockets sending 1Hz GPS ticks must maintain server CPU $< 10\%$ and response latency $< 50\text{ms}$.

---

## 5. Outdoor Physical Field Testing Protocol

Prior to production sign-off, execute a physical outdoor playtest:
- **Location:** Open municipal park or outdoor campus.
- **Hardware:** At least 3 physical mobile devices (iPhone Safari + Android Chrome).
- **Procedure:**
  1. Players gather at a central landmark; Host creates room under **Standard Preset** (10m round, 30s head start).
  2. Verify all devices show green GPS accuracy circles ($< 10\text{m}$).
  3. Host starts game $\rightarrow$ confirm 30s head-start scatter begins.
  4. Runners scatter 100 meters away while Hunters are locked.
  5. Hunter uses live map to track Runner 1.
  6. Hunter approaches Runner 1 $\rightarrow$ confirm 10m alarm sounds and vibrates Hunter phone; confirm Runner phone remains silent.
  7. Runner 2 activates Invisibility Cloak $\rightarrow$ confirm Runner 2 vanishes from Hunter map for 15s.
  8. Hunter approaches Runner 1 within $3–4\text{m}$ and presses "TAG RUNNER" $\rightarrow$ confirm elimination.
  9. Confirm round ends when timer reaches 00:00 or all Runners are caught.

---

## 6. Standard Bug Reporting Template

```markdown
### [BUG] Mobile Title

- **Severity:** [Critical / High / Medium / Low]
- **Device & OS:** [e.g., iPhone 14 Pro, iOS 17.4, Mobile Safari OR Samsung Galaxy S23, Android 14, Mobile Chrome]
- **Display Type:** [Dynamic Island / Notch / Standard Hole-punch]
- **Game Screen:** [Home / Lobby / Gameplay / Profile / Results]
- **Rule Preset:** [Quick / Standard / Big Park / Custom]

#### Steps to Reproduce:
1. ...
2. ...

#### Expected Behavior:
...

#### Actual Behavior:
...

#### Mobile Screenshot / Video:
[Attach media here]
```
