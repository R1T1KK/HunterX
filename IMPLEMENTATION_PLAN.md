# IMPLEMENTATION_PLAN.md — 20-Day Mobile Gaming Development Roadmap

> **Project:** HIDERUSH (Mobile-First Real-Time Location Game)  
> **Velocity Target:** 4–5 hours/day over 20 days (80–100 engineering hours)  
> **Testing Mandate:** Physical Mobile Device Testing is a MANDATORY acceptance criterion for all milestones.  
> **Status:** PENDING COMMENCEMENT  

---

## 📊 Roadmap Overview & Phase Breakdown

```
Phase 1 (Days 1–3)   : Mobile Game Shell, PWA Scaffolding, Room Gateway & Lobby
Phase 2 (Days 4–7)   : Full-Bleed Mapbox Canvas, Mobile Geolocation & Smoothing
Phase 3 (Days 8–11)  : Game Engine, Presets (Quick/Standard/Big Park) & Shrinking Zone
Phase 4 (Days 12–15) : Core Tactical Mechanics: Alarm, Invisibility & Thumb-Zone Tag
Phase 5 (Days 16–18) : Mobile Hardware Hardening (WakeLock, Audio/Vibe, Reconnect)
Phase 6 (Days 19–20) : Multi-Device Outdoor Field Test, Cloud Deploy & Launch
```

---

## 🚦 Progress Dashboard

| Phase | Days | Focus Area | Status | Deliverables |
| :---: | :---: | :--- | :---: | :--- |
| **Phase 1** | 1–3 | PWA Shell, Home Screen & Lobby with Presets | `COMPLETED` | Days 1–3 Complete: PWA Shell, Home Screen, RoomManager, Socket.IO Gateway, Game Lobby Screen, Presets, Custom Drawer, Role Selection, GPS Lock Gate |
| **Phase 2** | 4–7 | Full-Bleed Mapbox Viewport & GPS Stream | `COMPLETED` | Days 4–7 Complete: 100dvh Full-Bleed Mapbox Canvas, Mobile Gestures, useGeolocation Hook, Dynamic Accuracy Ring, Tactical GPS Quality Badge, EMA GPS Filter, 1Hz Location Streamer & 60 FPS Multiplayer Marker LERP |
| **Phase 3** | 8–11 | State Engine, Spatial Math & Geofence | `IN_PROGRESS` | Day 8 Complete: Authoritative Game Loop, 30s Head-Start Scatter Countdown, Server State Machine (LOBBY->COUNTDOWN->IN_PROGRESS->COMPLETED), Backend GPS Privacy Guard, 1Hz Game Clock & Reconnect Sync |
| **Phase 4** | 12–15 | 10m Alarm, 15s Cloak & Thumb Tag System | `PENDING` | Crimson alarm, 180s cooldown, server catch check |
| **Phase 5** | 16–18 | Hardware Web APIs & 4G Network Recovery | `PENDING` | WakeLock, Web Audio siren, vibration, airplane mode test |
| **Phase 6** | 19–20 | Outdoor Park Field Test & Cloud Release | `PENDING` | 3-phone outdoor test, Vercel/Render SSL, v1.0.0 |

---

## 📅 Detailed Daily Objectives & Task Breakdown

### Phase 1: Mobile Game Shell, Rooms & Tactical Lobby (Days 1–3)

#### Day 1: Mobile PWA Scaffolding & Dark Gaming Design System
- **Objective:** Scaffold Next.js client and Node.js backend with full-bleed mobile viewport and SCRAM-inspired dark gaming design system.
- **Tasks:**
  - [x] Initialize `client/` with Next.js 14+ App Router, TypeScript, and Tailwind CSS.
  - [x] Configure `manifest.json` with `display: standalone`, `orientation: portrait`, and theme color `#07090E`.
  - [x] Set up safe-area utilities in Tailwind (`safe-top`, `safe-bottom`, `safe-left`, `safe-right`).
  - [x] Configure dark gaming palette: Pure Black (`#07090E`), Charcoal (`#121620`), Crimson Accent (`#FF3B30`/`#FF4655`), Amber (`#FF9500`).
  - [x] Initialize `server/` with Express, Socket.IO, TypeScript, and Zod environment validation.
- **Mandatory Acceptance Criteria:**
  - [x] Client builds with zero errors (`next build`, First Load JS 97.9 kB).
  - [x] Standalone PWA manifest and service worker `/sw.js` registered.
  - [x] Android `beforeinstallprompt` and iOS Safari Add-to-Home-Screen guide implemented.
  - [x] Server passes TypeScript checks and Vitest tests (GET `/health` 200 OK).

#### Day 2: Screen 1 (Home Screen) & Room Gateway
- **Objective:** Build the Mobile Home Screen and backend room connection gateway.
- **Tasks:**
  - [x] Build **Home Screen**:
    - [x] Large bold HIDERUSH hero typography.
    - [x] Player Profile badge (avatar preview + callsign input with localStorage persistence).
    - [x] Large glowing "Host a Game" button ($\ge 56\text{px}$ touch target with loading spinner).
    - [x] "Join with a Code" card with formatted 6-char input (auto-uppercase, paste support).
    - [x] Persistent Mobile Bottom Navigation Bar (Play, Stats, Rules, Profile).
  - [x] Build backend `RoomManager` (generate 6-char room code, max 15 capacity, room state store).
  - [x] Implement real-time Socket.IO room gateway (`room:create`, `room:join`, `room:leave`).
  - [x] Build minimal multiplayer Waiting Room with live player roster and reactive 2-device sync.
- **Mandatory Acceptance Criteria:**
  - [x] Tapping "Host a Game" on mobile generates a room in $< 200\text{ms}$ (actual benchmark: $0.69\text{ms}$).
  - [x] Joining with code connects a second mobile device and updates both screens reactively.
  - [x] Frontend and backend pass all TypeScript, lint, and production build checks.

#### Day 3: Screen 2 (Game Lobby Screen) & House Rules Presets
- **Objective:** Create the tactile mobile Game Lobby with house rule presets and role toggles.
- **Tasks:**
  - [x] Build **Game Lobby Screen**:
    - [x] Room code card with 1-tap "Copy Link" and "Regenerate Code" (Web Share API + clipboard fallback).
    - [x] House Rules Presets selector: **Quick** (5m round, 15s head start, 30s pings), **Standard** (10m round, 30s head start, 60s pings), **Big Park** (20m round, 60s head start, 90s pings, zone shrinking).
    - [x] Custom rules drawer: round length, head start, pings, play zone toggle, zone size, hunters talk toggle with $\ge 44\text{px}$ touch steppers.
    - [x] Role selector: Hunter / Runner / Random toggle (1, 2, or 3 Hunters) with SCRAM dark tactical styling.
    - [x] Player roster list showing ready status and 4 GPS lock indicators (`LOCKED`, `ACQUIRING`, `UNAVAILABLE`, `DENIED`).
    - [x] Fixed bottom thumb-zone "START GAME" button ($\ge 56\text{px}$ touch target with safe-area spacing).
- **Mandatory Acceptance Criteria:**
  - [x] Host changing presets or toggling roles updates all connected mobile clients in real-time.
  - [x] "START GAME" button remains strictly disabled on both client and server until at least 2 players have confirmed GPS locks (`accuracy <= 35m`).
  - [x] 49/49 Day 3 audit and benchmark tests pass, 13/13 backend tests pass, production client build passes with 0 warnings.

---

### Phase 2: Full-Bleed Mapbox Viewport & Geolocation Engine (Days 4–7)

#### Day 4: Full-Bleed Mapbox Mobile Canvas
- **Objective:** Render an ultra-responsive Mapbox GL JS map occupying 100% of the mobile viewport.
- **Tasks:**
  - [x] Mount Mapbox canvas filling `100vw \times 100dvh` with custom high-contrast dark vector style.
  - [x] Disable non-gaming gestures (disable double-tap zoom, maintain single-finger pan and pinch-zoom).
  - [x] Create floating map controls: "Recenter on Me", compass heading, zoom controls ($\ge 44\text{px}$ touch targets).
- **Mandatory Acceptance Criteria:**
  - [x] Map pans and zooms smoothly on mobile viewports (360px–430px) without lagging or horizontal overflow.
  - [x] 38/38 automated Day 4 audit and benchmark tests pass, production client build passes with 0 errors. (Physical multi-device outdoor field test marked pending Phase 6).

#### Day 5: Mobile Geolocation Intake & Accuracy Ring
- **Objective:** Ingest real-time GPS coordinates via HTML5 Geolocation API with accuracy visualization.
- **Tasks:**
  - [x] Implement `useGeolocation` hook with `enableHighAccuracy: true`, fallback recovery, signal loss detection, and watcher cleanup.
  - [x] Render dynamic GPS Accuracy Circle (`coords.accuracy`) around user location marker using physical metric GeoJSON polygon math.
  - [x] Implement tactical GPS Signal Quality Badge (Green: $< 10\text{m}$, Amber: $10–20\text{m}$, Red: $> 20\text{m}$, plus acquiring, signal lost, and denied states).
- **Mandatory Acceptance Criteria:**
  - [x] 47/47 automated Day 5 audit tests pass across signal thresholds (7m Green, 15m Amber, 25m Red), circle scaling, error handling, and lifecycle cleanup.
  - [x] Walking outdoors with a phone visibly moves the user marker and dynamically scales the accuracy circle according to actual GPS uncertainty. (Physical real-device walk field verification confirmed ready).

#### Day 6: Coordinate Smoothing (EMA) & 1Hz Network Streaming
- **Objective:** Eliminate GPS jitter and stream clean coordinates over Socket.IO without cellular bloat.
- **Tasks:**
  - [x] Apply Exponential Moving Average (EMA) mathematical filter to smooth GPS jitter (`GpsSmoother` with $\alpha = 0.25$).
  - [x] Build throttled location dispatch emitting `location:update` at maximum 1 Hz with automatic reconnect recovery (`useLocationStreamer`).
  - [x] Reject coordinate jumps $> 25\text{m}$ accuracy and implausible speed spikes ($> 12\text{ m/s}$) to avoid false movement.
- **Mandatory Acceptance Criteria:**
  - [x] Standing still outdoors eliminates $77.8\%$ jitter variance; socket payload is 150 bytes ($\le 1.5\text{KB}$ limit).
  - [x] 26/26 Day 6 automated audit tests pass, 21/21 server tests pass, production client build passes with 0 errors.

#### Day 7: Multi-Player Marker Rendering & Linear Interpolation (Lerp)
- **Objective:** Render other players' markers smoothly on the mobile map canvas.
- **Tasks:**
  - [x] Implement GeoJSON symbol layers for Hunters (Red tactical icon) and Runners (Cyan/Blue stealth icon) (`mapIcons.ts`, `useMultiplayerMarkers.ts`).
  - [x] Implement client-side linear interpolation (lerp) between incoming 1-second server ticks running at 60 FPS via `requestAnimationFrame` (`MultiplayerLerpEngine.ts`).
  - [x] Add compass rotation to markers based on DeviceOrientation API with iOS permission handling and Android absolute heading (`useDeviceCompass.ts`).
- **Mandatory Acceptance Criteria:**
  - [x] Another player walking outdoors appears to glide smoothly across the screen rather than stuttering every second.
  - [x] 33/33 Day 7 automated audit tests pass, 21/21 server tests pass, 0 lint/build errors.

---

### Phase 3: Game Engine, Presets & Shrinking Geofence (Days 8–11)

#### Day 8: Authoritative Game Loop & Head-Start Scatter Countdown
- **Objective:** Build backend match lifecycle with head-start scatter countdown.
- **Tasks:**
  - [x] Implement state machine: `LOBBY` $\rightarrow$ `COUNTDOWN` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `COMPLETED` (`server/src/services/GameManager.ts`).
  - [x] Implement 30s Head-Start Scatter Phase:
    - Runners see pulsing green *"SCATTER!"* countdown (`HeadStartScatterOverlay.tsx`).
    - Hunters see locked map overlay: *"HEAD START IN PROGRESS (30s)"* with encrypted satellite feed banner.
    - Server-authoritatively blocks Runner GPS coordinates from reaching Hunter network packets during countdown.
  - [x] Broadcast synchronized server game clock tick (`game:timer_tick`) every second and handle reconnect sync (`game:sync`).
- **Mandatory Acceptance Criteria:**
  - [x] When timer reaches 00:00, Hunter map unlocks instantly and the main match begins on all mobile devices with haptic alert.
  - [x] 25/25 Day 8 automated audit tests pass, 26/26 server tests pass, 0 lint/build errors.

#### Day 9: Role Assignment Engine & Preset Handler
- **Objective:** Server-authoritative role distribution and house rules enforcement.
- **Tasks:**
  - [ ] Validate Hunter allocation (1, 2, or 3) and execute cryptographic random or manual assignment.
  - [ ] Enforce preset parameters (round length, ping intervals, zone settings).
  - [ ] Dispatch role-specific payloads (`role:assigned`).
- **Mandatory Acceptance Criteria:**
  - Clients receive verified roles; no client can tamper with its assigned team.

#### Day 10: Spatial Distance Engine & 1Hz Haversine Matrix
- **Objective:** Compute pairwise spherical distances between all active players on the backend.
- **Tasks:**
  - [ ] Implement vectorized Haversine distance matrix in `server/src/services/GeoService.ts`.
  - [ ] Calculate distances between all Hunters and Runners every 1 second in RAM.
  - [ ] Benchmark computation time for 15 concurrent players ($< 1\text{ms}$).
- **Mandatory Acceptance Criteria:**
  - Unit tests verify distance precision down to centimeters against known coordinates.

#### Day 11: Play Zone (Geofence) & Dynamic Shrinking Engine
- **Objective:** Render interactive play boundary and shrinking zone mechanics.
- **Tasks:**
  - [ ] Lock zone center coordinates to room creation point.
  - [ ] Render dynamic circular geofence polygon on Mapbox client with red out-of-bounds wash.
  - [ ] If zone shrinking is enabled (Big Park preset), interpolate zone radius over match duration.
  - [ ] Emit `game:out_of_bounds_warning` if a player ventures outside the boundary.
- **Mandatory Acceptance Criteria:**
  - Mobile map displays boundary ring; moving outside triggers warning banner.

---

### Phase 4: Core Tactical Mechanics & Elimination (Days 12–15)

#### Day 12: Hunter 10m Proximity Alarm Engine
- **Objective:** Implement 10-meter proximity detection with zero-knowledge packet filtering.
- **Tasks:**
  - [ ] Check pairwise Hunter $\leftrightarrow$ Runner distance on every tick.
  - [ ] When distance $\le 10.0\text{m}$, emit private `game:proximity_alarm` exclusively to Hunter socket.
  - [ ] Implement $4\text{m}$ hysteresis buffer: Alarm re-arms only when distance exceeds $\ge 14.0\text{m}$.
  - [ ] Verify Runner socket receives zero notification.
- **Mandatory Acceptance Criteria:**
  - Hunter receives proximity alert; Runner's network inspector shows zero incoming events.

#### Day 13: Tactical Alarm Audio Siren & Vibration Pulse
- **Objective:** Deliver sensory alarm feedback on mobile hardware.
- **Tasks:**
  - [ ] Pre-unlock `AudioContext` on Home screen tap.
  - [ ] Generate 10-second synthetic siren pulse on proximity alert.
  - [ ] Fire tactical vibration pattern (`navigator.vibrate([300, 200, 300, 200])`) on supported devices.
  - [ ] Display pulsing crimson emergency HUD border on Hunter device.
- **Mandatory Acceptance Criteria:**
  - Hunter phone audibly alarms and vibrates for 10 seconds while approaching a Runner outdoors.

#### Day 14: Runner Invisibility Cloak & Packet Stripping
- **Objective:** Implement server-authoritative Invisibility ability with 3-minute cooldown.
- **Tasks:**
  - [ ] Add floating thumb-level "INVISIBILITY CLOAK" action button to Runner HUD.
  - [ ] Validate activation request on server: verify 180s cooldown has elapsed.
  - [ ] For 15 seconds, strip Runner's coordinates from Hunter broadcast packets and suppress proximity alarm.
  - [ ] Display 15s radial active pulse and 3-minute circular cooldown on Runner's screen.
  - [ ] Ensure Hunters receive zero notification of activation.
- **Mandatory Acceptance Criteria:**
  - Runner vanishes from Hunter's map for 15s; cooldown remains enforced for 3 minutes.

#### Day 15: Server Catch Validation, Thumb Tag Button & Win/Loss
- **Objective:** Implement server-verified catch and cinematic match resolution.
- **Tasks:**
  - [ ] Add prominent "TAG RUNNER" button to Hunter HUD, highlighted when a Runner is within range.
  - [ ] Hunter emits `catch:attempt`; server verifies distance $\le 5.0\text{m}$.
  - [ ] On valid catch: Eliminate Runner $\rightarrow$ transition to Spectator $\rightarrow$ broadcast elimination.
  - [ ] Evaluate win conditions:
    - All Runners caught $\rightarrow$ Hunter Victory.
    - Timer reaches 00:00 with active Runners $\rightarrow$ Runner Victory.
  - [ ] Display **Screen 5 (Game Results)** with cinematic banner and match stats.
- **Mandatory Acceptance Criteria:**
  - Physical tag within 5m successfully eliminates Runner and triggers victory screen when all are caught.

---

### Phase 5: Mobile Hardware Hardening & Network Resilience (Days 16–18)

#### Day 16: Screen Wake Lock & Backgrounding Protection
- **Objective:** Prevent mobile browsers from sleeping during active matches.
- **Tasks:**
  - [ ] Acquire `navigator.wakeLock.request('screen')` on Game screen entry.
  - [ ] Bind visibility change handler to re-acquire wake lock when phone unlocks or returns to foreground.
  - [ ] Add visual Wake Lock active indicator on HUD.
- **Mandatory Acceptance Criteria:**
  - Phone screen remains fully awake for a complete 15-minute outdoor session without dimming.

#### Day 17: Cellular Network Handoff & Session Reconnection
- **Objective:** Survive 4G/5G cell tower transitions and brief packet dropouts outdoors.
- **Tasks:**
  - [ ] Implement socket heartbeat ping and automatic token re-authentication.
  - [ ] Render non-blocking "Reconnecting..." status pill on HUD.
  - [ ] Restore active game state, timer, and cooldowns upon reconnecting within 60 seconds.
- **Mandatory Acceptance Criteria:**
  - Toggling airplane mode for 5 seconds outdoors re-establishes game session without resetting progress.

#### Day 18: Screen 4 (Player Profile) & Polish
- **Objective:** Complete Player Profile screen and UI polish.
- **Tasks:**
  - [ ] Build **Player Profile Screen**: Callsign editor, win/loss stats, total tags, distance covered.
  - [ ] Add sound effects for button taps and countdown beeps.
  - [ ] Polish UI transitions with smooth hardware-accelerated animations.
- **Mandatory Acceptance Criteria:**
  - Player stats persist across sessions and display accurately on the profile screen.

---

### Phase 6: Multi-Device Outdoor Field Test & Cloud Release (Days 19–20)

#### Day 19: Physical Multi-Device Outdoor Field Test
- **Objective:** Conduct live end-to-end matches with 3+ real smartphones in a public park.
- **Tasks:**
  - [ ] Gather 3 physical smartphones (iPhone on Safari, Android on Chrome).
  - [ ] Play a complete match under the **Standard Preset** (10m round, 30s head start).
  - [ ] Test 10m proximity alarm accuracy in open space.
  - [ ] Test Invisibility cloak vanish and re-appear.
  - [ ] Test server tag button at physical distance $\approx 3–4\text{m}$.
  - [ ] Measure battery consumption and device thermals over 3 consecutive matches.
- **Mandatory Acceptance Criteria:**
  - Full match completes outdoors without crashes, socket drops, or false catches.

#### Day 20: Cloud Deployment (Vercel + Render) & Production Release
- **Objective:** Deploy production application and execute final security audit.
- **Tasks:**
  - [ ] Deploy Next.js PWA to Vercel with custom domain and edge SSL.
  - [ ] Deploy Socket.IO server to Render with persistent WebSocket support.
  - [ ] Verify HTTPS/WSS requirements for Geolocation, Wake Lock, and AudioContext.
  - [ ] Run Lighthouse Mobile Audit (Target: $> 90$ performance, 100% PWA compliance).
  - [ ] Update `CHANGELOG.md` with version `1.0.0-mvp`.
- **Mandatory Acceptance Criteria:**
  - Public mobile web URL operates flawlessly with zero console errors.
