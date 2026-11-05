# SPEC.md — HIDERUSH Technical & Functional Specification

> **Status:** OFFICIAL PROJECT SPECIFICATION (PRIMARY SOURCE OF TRUTH)  
> **Version:** 1.1.0  
> **Last Updated:** 2026-11-05  
> **Author:** Senior Software Architect  
> **Design Philosophy:** STRICTLY MOBILE-FIRST REAL-TIME LOCATION GAME (PWA)

---

## 1. Project Overview & Mobile Gaming Mandate

HIDERUSH is a real-world, browser-based, asymmetric multiplayer Hide & Seek game powered by the HTML5 Geolocation API, Mapbox GL JS, and Socket.IO. Players physically move in the physical world while interacting through an immersive mobile web application designed to behave like a native mobile game (PWA).

### 1.1 Mobile-First Architectural Mandate
- **Primary Target Platforms:** Android smartphones (Mobile Chrome 100+) and iPhones (Mobile Safari iOS 16+).
- **Not a Desktop Website:** Desktop browser support is strictly secondary and will never dictate or compromise mobile UI/UX layouts.
- **PWA Experience:** Progressive Web App manifest enabled (`display: standalone`, `orientation: portrait`), full-bleed canvas (`viewport-fit=cover`), native touch responsiveness, and zero browser chrome when installed to the home screen.
- **Visual Design Identity (SCRAM-Inspired):**
  - Dark tactical gaming aesthetic: Pure black (`#07090E`) and charcoal (`#121620`) backgrounds.
  - Primary accent: High-voltage red/crimson (`#FF3B30` / `#FF4655`) and tactical amber/orange (`#FF9500`).
  - High-contrast typography: Large bold geometric headings (sans-serif) for instant readability while running outdoors in sunlight.
  - Rounded gaming cards: Soft, rounded containers (`rounded-2xl` to `rounded-3xl`) with subtle border glows and backdrop blurs.
  - Thumb-Zone Ergonomics: Primary action buttons (Catch, Invisibility, Radio, Start) fixed to bottom viewport regions above safe-area insets.
  - Minimal visual clutter: Compact floating HUD overlays over a dominant, full-screen interactive GPS map.

---

## 2. Requirement Classification Matrix

- **[CONFIRMED]**: Core functional requirement locked for MVP.
- **[APPROVED MOBILE SPEC]**: Visual and mobile UX requirement derived from the gaming reference update.
- **[APPROVED ARCHITECTURAL DECISION]**: Server-authoritative logic or anti-cheat protection.
- **[FUTURE SCOPE]**: Post-MVP candidate feature.

---

## 3. Five Core Mobile Application Screens

### 3.1 Screen 1: Home Screen
- **FS-01 [APPROVED MOBILE SPEC]:** **Header & Player Profile Badge:** Displays player avatar, chosen callsign/nickname, and quick access to the Player Profile screen.
- **FS-02 [APPROVED MOBILE SPEC]:** **Hero Branding:** Bold HIDERUSH typography and tactical glowing logo.
- **FS-03 [APPROVED MOBILE SPEC]:** **Primary Actions:**
  - **"Host a Game" Button:** Prominent red/orange glowing button that instantiates a new room and opens the Game Lobby.
  - **"Join with a Code" Input & Button:** Clean card with 6-character room code input and instant join trigger.
- **FS-04 [APPROVED MOBILE SPEC]:** **Bottom Navigation Bar:** Persistent mobile navigation tabs (Play, Stats, Rules, Profile) with haptic feedback.

### 3.2 Screen 2: Game Lobby Screen
- **FS-05 [APPROVED MOBILE SPEC]:** **Room Code Card:** Prominent display of 6-character room code with a one-tap "Copy Link/Code" button and a host option to "Change Code / Regenerate".
- **FS-06 [APPROVED MOBILE SPEC]:** **Game Mode & House Rules Presets:**
  - **Quick Preset:** 5-minute round, 15s head start, 30s ping intervals, small zone ($200\text{ m}$).
  - **Standard Preset:** 10-minute round, 30s head start, 60s ping intervals, medium zone ($500\text{ m}$).
  - **Big Park Preset:** 20-minute round, 60s head start, 90s ping intervals, large zone ($1000\text{ m}$) with zone shrinking enabled.
  - **Custom Rules Accordion:** Allows host to individually customize:
    - *Round Length:* 5, 10, 15, or 20 minutes.
    - *Head Start (Scatter Period):* 15s, 30s, 60s, or 90s.
    - *Pings Interval:* Live continuous vs. periodic radar sweeps (30s, 60s, continuous).
    - *Hunters Can Talk Toggle:* Enables voice/radio channel communication for Hunter team.
    - *Play Zone Toggle:* Enable/disable circular geofence boundary.
    - *Zone Size & Shrinking Interval:* Initial radius and minutes between shrinking phases.
- **FS-07 [CONFIRMED]:** **Role Allocation Selector:**
  - Host toggles between Hunter, Runner (Hider), or Random assignment.
  - Select 1, 2, or 3 Hunters. Remaining players become Runners (Hiders).
- **FS-08 [APPROVED MOBILE SPEC]:** **Player Roster Card:** Real-time list of up to 15 players showing nickname, role badge, host crown, and GPS lock readiness indicator (Green/Red dot).
- **FS-09 [APPROVED MOBILE SPEC]:** **Fixed Bottom "Start Game" Action:** Large, thumb-accessible tactile button enabled only when host conditions are met (minimum 2 players with active GPS locks).

### 3.3 Screen 3: Gameplay Screen (Primary Tactical Map HUD)
- **FS-10 [CONFIRMED & APPROVED MOBILE SPEC]:** **Full-Screen GPS Canvas:** Mapbox GL JS map fills 100% of the mobile viewport ($100\text{vw} \times 100\text{dvh}$) with custom high-contrast dark vector tiles.
- **FS-11 [APPROVED MOBILE SPEC]:** **Compact Floating Top HUD:**
  - *Center:* Match Timer countdown (`MM:SS`) and active phase banner ("SCATTER!", "HUNT ACTIVE").
  - *Left:* Remaining Runners/Hiders badge (`RUNNERS: 3/4`).
  - *Right:* Next Radar Ping countdown (`PING: 00:24`) and Play Zone status.
- **FS-12 [APPROVED MOBILE SPEC]:** **Head-Start Overlay:** During the 30-second scatter period:
  - Runners see a pulsing green timer: *"SCATTER! Find concealment!"*
  - Hunters see a darkened map overlay with a lock countdown: *"HEAD START IN PROGRESS (28s)"*.
- **FS-13 [CONFIRMED & APPROVED MOBILE SPEC]:** **Play Zone (Geofence) Visualization:**
  - Dynamic GeoJSON circle layer displaying boundary line and red hazardous out-of-bounds wash.
  - Shrinking zone animation smoothly contracting to new radius when configured by house rules.
- **FS-14 [APPROVED MOBILE SPEC]:** **Interactive Tactical Controls:**
  - *Quick Comms / Radio Button:* Floating thumb-level button for audio cues/voice chat toggle.
  - *Recenter GPS Button:* Floats on lower right above thumb zone.
  - *Settings & Rules Drawer:* Minimal icon in top corner to view current house rules without leaving the map.
- **FS-15 [CONFIRMED & APPROVED MOBILE SPEC]:** **Thumb-Zone Action Bar (Role-Specific):**
  - **Hunter HUD:** Prominent red "TAG RUNNER" button that becomes active when a Runner is within valid server catch range ($\le 5\text{ m}$).
  - **Runner HUD:** Prominent cyan/amber "INVISIBILITY CLOAK" button showing 15s active pulse and circular 3-minute cooldown timer.
- **FS-16 [CONFIRMED]:** **Hunter Proximity Alarm Banner:** When any Runner is within $10\text{ m}$ of a Hunter, a full-width pulsing crimson emergency banner flashes on the Hunter's HUD accompanied by a 10-second siren and vibration pulse. Runners receive zero notification.

### 3.4 Screen 4: Player Profile Screen
- **FS-17 [APPROVED MOBILE SPEC]:** Displays callsign/nickname editor, player lifetime statistics (Matches Played, Wins as Hunter, Wins as Runner, Total Tags, Survival Rate, Total Real-World Distance Covered), and tactical badge customization.

### 3.5 Screen 5: Game Results & Debrief Screen
- **FS-18 [APPROVED MOBILE SPEC]:** **Cinematic Victory / Defeat Header:** Glowing team victory banner ("HUNTERS WIN" / "RUNNERS SURVIVE").
- **FS-19 [APPROVED MOBILE SPEC]:** **Match Telemetry Card:** Total match duration, MVP Hunter, longest surviving Runner, and chronological elimination timeline.
- **FS-20 [APPROVED MOBILE SPEC]:** **Action Footer:** "Play Again / Rematch" (Host) and "Return to Lobby" buttons anchored at the bottom.

---

## 4. Mobile UX & Ergonomic Technical Requirements

- **MUX-01 [APPROVED MOBILE SPEC]:** **Safe-Area Insets:** All top HUD bars, bottom navigation, and action buttons must strictly apply `padding-top: env(safe-area-inset-top)` and `padding-bottom: env(safe-area-inset-bottom)` to accommodate iPhone Dynamic Island/notches and Android gesture bars.
- **MUX-02 [APPROVED MOBILE SPEC]:** **Touch Target Compliance:** Every interactive element (buttons, tabs, toggles, icons) must have a touch bounding box of at least **$44\text{px} \times 44\text{px}$** for effortless one-handed use while walking or running.
- **MUX-03 [APPROVED MOBILE SPEC]:** **Viewport Stability:** The application shell must enforce `touch-action: manipulation`, `overflow: hidden`, and `user-scalable=no` on HUD overlays to eliminate accidental double-tap zooming, pinch-to-zoom on menus, or pull-to-refresh browser gestures.
- **MUX-04 [APPROVED MOBILE SPEC]:** **Screen Wake Lock:** The Screen Wake Lock API (`navigator.wakeLock`) must be acquired automatically upon entering the Lobby or Gameplay screen to prevent phones from dimming or locking during outdoor gameplay.
- **MUX-05 [APPROVED MOBILE SPEC]:** **Performance Budget on Average Hardware:**
  - Total initial JS bundle under $200\text{ KB}$ gzipped.
  - Mapbox vector rendering capped at 60 FPS on Snapdragon 7-series and iPhone 11 hardware.
  - Zero expensive DOM re-renders inside the 1Hz GPS tick cycle.

---

## 5. Confirmed Game Mechanics (Unchanged Source of Truth)

- **Max 15 players per private room** with unique 6-character codes.
- **1, 2, or 3 Hunters** (assigned manually or randomly by Host); all remaining players become **Runners / Hiders**.
- **Hunter Proximity Alarm:** Triggers at $\le 10.0\text{ m}$ for 10 seconds; sound + vibration; Hunter only; $4\text{ m}$ hysteresis buffer.
- **Runner Invisibility:** 15-second duration; 3-minute (180s) server-enforced cooldown; coordinates scrubbed from Hunter network packets; zero notification to Hunters.
- **Server-Authoritative Catch Validation:** Hunter submits catch attempt; server verifies real-time distance $\le 5.0\text{ meters}$.
- **Win Conditions:**
  - Hunters win if all Runners are eliminated before the timer reaches 00:00.
  - Runners win if at least one Runner survives until the timer reaches 00:00.
