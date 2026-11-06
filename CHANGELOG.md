# CHANGELOG.md — HIDERUSH Project History

All notable changes to the HIDERUSH project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned for Phase 2 (Days 6–7)
- Day 6: Exponential Moving Average (EMA) mathematical filtering and 1Hz location streaming.
- Day 7: Multi-player marker rendering and linear interpolation (lerp) gliding.

---

## [0.5.0-day5] - 2026-11-07

### Added
- **Production `useGeolocation` Hook (`client/src/hooks/useGeolocation.ts`):**
  - Continuous coordinate acquisition using HTML5 `navigator.geolocation.watchPosition()`.
  - Configured with `enableHighAccuracy: true`, `timeout: 10000ms`, `maximumAge: 1000ms`.
  - Full coordinate extraction: `latitude`, `longitude`, `accuracy` (meters), `altitude`, `heading`, `speed`, and `timestamp`.
  - Automatic fallback recovery: when high-accuracy acquisition times out, initiates low-accuracy fallback and schedules high-accuracy restoration attempts.
  - Heartbeat signal-loss monitoring: detects GPS stalls longer than 18 seconds and transitions to `GPS SIGNAL LOST`.
  - Single active watcher ref with guaranteed cleanup (`clearWatch`) on component unmount, preventing battery drain and memory leaks.
- **Dynamic GPS Accuracy Circle (`client/src/components/map/FullBleedMap.tsx`, `client/src/lib/geoUtils.ts`):**
  - Exact metric circle polygon generation (`createGeoJsonCircle`) scaling seamlessly across zoom levels and latitudes.
  - Live Mapbox vector fill and dashed perimeter stroke reflecting physical GPS uncertainty in meters (`coords.accuracy`).
  - Dynamic color coding: Emerald Green for $< 10\text{m}$, Tactical Amber for $10–20\text{m}$, and Crimson for $> 20\text{m}$.
  - User DOM marker with direction heading pointer rendered above accuracy layers.
- **Tactical GPS Signal Quality Badge (`client/src/components/ui/GPSQualityBadge.tsx`):**
  - Exact specification thresholds:
    - **GREEN ($< 10\text{m}$):** `GPS EXCELLENT`
    - **AMBER ($10–20\text{m}$):** `GPS MODERATE`
    - **RED ($> 20\text{m}$):** `GPS WEAK`
  - Specialized states: `ACQUIRING GPS`, `GPS SIGNAL LOST`, `LOCATION PERMISSION DENIED`, and `GPS UNAVAILABLE`.
  - Live numeric measurement readout in meters (`(±7m)`).
  - Floating top HUD integration in `GameMapScreen.tsx`.
- **Automated Verification & Benchmarks (`scripts/verify-day5.ts`):**
  - 47-point audit verifying all 10 required test scenarios including threshold accuracy math, polygon geometry scaling, watcher lifecycle, fallback recovery, and mobile UI rendering.

---

## [0.4.0-day4] - 2026-11-06

### Added
- **Full-Bleed Mapbox GL JS Mobile Canvas (`client/src/components/map/FullBleedMap.tsx`):**
  - Seamless full-bleed map viewport ($100\text{vw} \times 100\text{dvh}$) locked to `position: fixed; inset: 0`.
  - Zero unwanted margins, horizontal scrolling suppression, and safe-area inset handling (`safe-top`, `safe-bottom`, `safe-px`).
  - Mobile orientation change and dynamic address-bar resize listener (`map.resize()`) preventing layout distortion.
  - Graceful token missing and offline fallback rendering a dark tactical radar grid.
- **SCRAM-Inspired Dark Vector Styling (`client/src/components/map/mapConfig.ts`):**
  - Color palette: Pure Black (`#07090E`), Charcoal (`#121620`), High-Voltage Crimson (`#FF3B30`), Amber (`#FF9500`), dark road geometries (`#252C3D`/`#38435C`), muted parks (`#13231B`), and deep blue-grey water (`#0C1726`).
  - High-contrast street typography optimized for outdoor mobile gaming readability in direct sunlight.
- **Mobile Touch Gesture Optimizations:**
  - Single-finger fluid pan enabled (`dragPan: true`).
  - Pinch-to-zoom and two-finger rotate enabled (`touchZoomRotate: true`).
  - Double-tap zoom strictly disabled (`doubleClickZoom: false`) to eliminate accidental zoom bursts during fast physical movement.
  - Scroll zoom and box zoom disabled to eliminate desktop conflict.
- **Tactical Floating Map Controls (`client/src/components/map/FloatingMapControls.tsx`):**
  - **Recenter on Me:** Thumb-zone crosshair button with GPS acquisition spinner and smooth `map.flyTo` animation.
  - **Compass Heading:** Dynamically rotating compass needle updating on map rotation; 1-tap reset to North (`bearing: 0, pitch: 0`).
  - **Tactical Zoom Controls:** Touch targets meeting $\ge 44\text{px} \times 44\text{px}$ standard with smooth animated zoom step increments.
- **Gameplay Screen Assembly (`client/src/components/map/GameMapScreen.tsx`):**
  - Dedicated full-screen gameplay canvas housing Layer 0 Mapbox canvas and Layer 1 floating tactical HUD.
  - Exit match confirmation dialog preventing accidental match abandonment.
  - Routing integration in `client/src/app/page.tsx` for active matches (`STARTING` or `IN_PROGRESS`) and 1-tap "Tactical Map Canvas" preview on Home Screen.
- **Automated Verification & Benchmarks (`scripts/verify-day4.ts`):**
  - 38-point audit verifying package dependencies, full-bleed CSS, gesture flags, SCRAM color tokens, touch targets, and responsive mobile viewport dimensions (360px–430px).

---

## [0.3.0-day3] - 2026-11-06

### Added
- **Tactical Game Lobby Screen (`client/src/components/lobby/GameLobbyScreen.tsx`):**
  - Mobile-first, portrait-optimized game staging area with full safe-area insets (`safe-top`, `safe-bottom`, `safe-px`).
  - Seamless integration with URL query parameters (`?code=XXXXXX`) for instantaneous one-tap invites.
  - Thumb-zone anchored "START GAME" button with pulsating visual feedback when launch criteria are fulfilled.
  - Mandatory server-authoritative GPS Lock Gate: "START GAME" button strictly disabled until at least 2 players have confirmed GPS locks (`accuracy <= 35m`).
- **Room Code Card (`client/src/components/lobby/RoomCodeCard.tsx`):**
  - Large alphanumeric 6-character room code display with high-contrast font.
  - Native Web Share API integration with automatic fallback to clipboard copy.
  - Host-only cryptographically secure code regeneration with seamless Socket.IO channel re-registration without disconnecting connected players.
- **House Rules Presets Selector (`client/src/components/lobby/HouseRulesPresets.tsx`):**
  - **Quick:** 5-minute round, 15-second head start, 30-second radar pings, 250m static zone.
  - **Standard:** 10-minute round, 30-second head start, 60-second radar pings, 500m static zone.
  - **Big Park:** 20-minute round, 60-second head start, 90-second radar pings, 1000m dynamic shrinking zone.
  - Instant reactive synchronization to all connected players on change.
- **Custom Rules Drawer (`client/src/components/lobby/CustomRulesDrawer.tsx`):**
  - Full-featured mobile modal drawer with tactile $\ge 44\text{px}$ touch steppers for round length, head start, radar sweep interval, play zone radius, zone shrinking, and Hunters radio talk toggles.
- **Role Selection System (`client/src/components/lobby/RoleSelector.tsx`):**
  - 3-segment SCRAM-style segmented control: `Hunter`, `Runner`, `Random`.
  - Tactical hunter headcount selector (1, 2, or 3 Hunters).
- **Player Roster with Live GPS Tracking (`client/src/components/lobby/PlayerRoster.tsx`):**
  - Real-time roster display showing initials avatars, callsigns, host indicators, and ready status.
  - Live 4-state GPS indicators: `LOCKED` (Emerald), `ACQUIRING` (Amber pulse), `UNAVAILABLE` (Rose), `DENIED` (Red alert).
- **HTML5 Geolocation Stream Hook (`client/src/hooks/useGeolocation.ts`):**
  - High-accuracy continuous location watcher with automatic GPS state updates piped to the backend Socket.IO gateway.
- **Backend RoomManager & Socket.IO Gateway Enhancements (`server/src/services/RoomManager.ts`, `server/src/socket/roomGateway.ts`):**
  - In-memory preset application and custom rules override validation.
  - Role settings management and host authorization enforcement.
  - Host-only code regeneration preserving socket connections using `socketsJoin` and `socketsLeave`.
  - Authoritative `canStartGame` validator enforcing Host caller, `WAITING` status, $\ge 2$ players, and $\ge 2$ confirmed GPS locks.
  - New Socket.IO events: `room:update-rules`, `room:settings-updated`, `room:update-role-settings`, `room:role-settings-updated`, `room:update-gps-status`, `room:gps-status-updated`, `room:update-ready`, `room:player-ready-updated`, `room:regenerate-code`, `room:code-regenerated`, `room:start-game`, `room:game-started`.
- **Automated Verification & Benchmarks (`scripts/verify-day3.ts`):**
  - 49-point comprehensive audit and end-to-end multi-device benchmark test suite.
  - 100% pass rate across room code regeneration, preset rules, role settings, GPS lock gate enforcement, Socket.IO 2-device real-time sync, and mobile ergonomics touch targets.

---

## [0.2.0-day2] - 2026-11-06

### Added
- **Mobile Home Screen (`client/src/components/home/HomeScreen.tsx`):**
  - High-impact SCRAM-inspired dark gaming layout with bold HIDERUSH typography.
  - Callsign management system with circular avatar preview, inline editor modal, and `localStorage` persistence.
  - "Host a Game" action button with loading spinner, disabled state, and error handling.
  - "Join with a Code" card with 6-character auto-uppercase alphanumeric filtering and paste support.
  - Fixed bottom navigation bar with 4 tabs: `Play`, `Stats`, `Rules`, `Profile`.
  - Placeholder views for Stats, Rules, and Operator Profile.
- **Backend RoomManager (`server/src/services/RoomManager.ts`):**
  - In-memory `RoomManager` class using Node.js `crypto` for collision-resistant 6-character uppercase room codes.
  - Hard limit enforcement of 15 players maximum per room.
  - Host assignment and automatic host migration when host disconnects.
  - Automatic room cleanup when empty.
  - Input validation using Zod schemas for room codes and callsigns.
- **Socket.IO Room Gateway (`server/src/socket/roomGateway.ts`):**
  - Client events: `room:create`, `room:join`, `room:leave`.
  - Server events: `room:created`, `room:joined`, `room:player-joined`, `room:player-left`, `room:state-updated`, `room:error`.
  - Full disconnect handling with player removal and room state broadcast.
- **Minimal Multiplayer Waiting Room (`client/src/components/lobby/WaitingRoom.tsx`):**
  - Room code display with 1-tap copy to clipboard.
  - Connected player roster showing callsigns, host crowns, and join timestamps.
  - Live 2-device reactive synchronization over WebSockets.
  - "Leave Room" action to cleanly exit and return to the home screen.
- **Automated Verification & Benchmarks (`scripts/verify-day2.ts`):**
  - In-memory room creation benchmark ($0.69\text{ms}$, well within $< 200\text{ms}$ budget).
  - In-memory room joining benchmark ($0.34\text{ms}$).
  - End-to-end multi-client Socket.IO synchronization test.
  - Mobile viewport dimensions audit (360px–430px) verifying safe-area insets and touch targets.

---

## [0.1.0-day1] - 2026-11-06

### Added
- **Frontend Scaffolding (`client/`):**
  - Next.js 14+ (App Router) with TypeScript strict mode and Tailwind CSS.
  - Progressive Web App (PWA) configuration with standalone manifest (`/manifest.json`), service worker (`/sw.js`), and SVG tactical icons (192px, 512px, maskable).
  - Android `beforeinstallprompt` installation banner and iOS Safari Add to Home Screen educational sheet (`InstallPrompt.tsx`).
  - Mobile safe-area system with CSS utilities: `.safe-top`, `.safe-bottom`, `.safe-left`, `.safe-right`, `.safe-px`, `.safe-py` leveraging `env(safe-area-inset-*)`.
  - HIDERUSH SCRAM-inspired Dark Gaming Design Tokens: Pure Black (`#07090E`), Charcoal (`#121620`), Card (`#191D26`), Crimson (`#FF3B30`), Amber (`#FF9500`).
  - Reusable gaming UI components: `Button` (touch-friendly 44px/56px), `Card`, and `Badge`.
  - Mobile Foundation Screen (`page.tsx`) with high-energy tactical header, callsign greeting, action buttons, and fixed bottom navigation pill bar.
- **Backend Scaffolding (`server/`):**
  - Node.js + Express + TypeScript HTTP server with Socket.IO integration.
  - Runtime environment variable validation using Zod (`server/src/config/env.ts`).
  - `GET /health` endpoint reporting service health, uptime, and timestamp.
  - Graceful shutdown handlers for `SIGTERM` and `SIGINT`.
  - Automated tests via Vitest verifying health endpoint and 404 routing.
- **Verification:**
  - Automated test and audit script (`scripts/verify-day1.ts`) verifying 36 criteria across PWA, design tokens, safe areas, and mobile dimensions.

---

## [1.1.0-mobile-spec] - 2026-11-05

### Added
- **Mobile-First Gaming Architecture & UX Mandate:**
  - Transitioned frontend architecture from generic responsive web to **Mobile-First PWA Gaming Shell** inspired by SCRAM.
  - Specified 5 core mobile screens: **Home Screen**, **Game Lobby Screen**, **Gameplay Screen (Tactical Map HUD)**, **Player Profile Screen**, and **Game Results Screen**.
  - Added House Rules Presets: **Quick**, **Standard**, and **Big Park** with customizable round length, head start, ping intervals, voice comms, and dynamic shrinking play zones.
  - Mandated safe-area insets (`env(safe-area-inset-top)`, `env(safe-area-inset-bottom)`) and minimum touch targets ($\ge 44\text{px}$ standard, $\ge 56\text{px}$ primary action).
  - Instituted **Physical Mobile Device Testing** as a mandatory QA acceptance gate in `TESTING.md` and `AGENTS.md`.

### Changed
- Updated `SPEC.md`, `ARCHITECTURE.md`, `IMPLEMENTATION_PLAN.md`, `README.md`, `TESTING.md`, and `AGENTS.md` to enshrine mobile gaming requirements.
- Confirmed nomenclature: Hunters vs. Runners (Hiders).

### Preserved
- All core game mechanics: 10m Hunter Proximity Alarm (10s duration, sound + vibration, zero hider alert), 15s Runner Invisibility Cloak (3m server cooldown, coordinate scrubbing), server-authoritative catch validation ($\le 5.0\text{m}$), and 15-player maximum capacity.

---

## [1.0.0-docs] - 2026-11-05

### Added
- Initial 13-file documentation system covering complete architectural, technical, security, testing, and deployment specifications.
