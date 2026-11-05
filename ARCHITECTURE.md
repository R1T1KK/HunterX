# ARCHITECTURE.md — HIDERUSH System & Mobile Game Architecture

> **Document Version:** 1.1.0  
> **Target System:** Mobile-First Real-Time Location Game (PWA / Mobile Browser)  
> **Status:** APPROVED SYSTEM ARCHITECTURE  

---

## 1. High-Level Architecture Overview

HIDERUSH is architected as an **immersive mobile web game** rather than a traditional desktop site. The client shell is built using Next.js 14+ (App Router) configured as a full-bleed Progressive Web App (PWA) with zero browser chrome, running atop a high-performance Node.js + Express + Socket.IO state and spatial calculation server.

```mermaid
flowchart TD
    subgraph MobileClient["Mobile PWA Client Shell (iOS Safari / Android Chrome)"]
        direction TB
        PWAManifest["PWA Web App Manifest (standalone / portrait)"]
        SafeInsetLayer["Safe Area Inset Layer (env(safe-area-inset-*))"]
        
        subgraph ViewportCanvas["Full-Bleed 100dvh Viewport"]
            MapLayer["Mapbox GL JS Vector Canvas (100% Bleed)"]
            FloatingHUD["Tactical Floating HUD (Top Stats & Ping Bar)"]
            ThumbZoneBar["Thumb-Zone Action Bar (Tag / Invisibility / Comms)"]
            GeofenceVisualizer["Play Zone & Shrinking Geofence Renderer"]
        end

        subgraph SensorServices["Mobile Web Hardware Services"]
            GeoService["HTML5 Geolocation Watcher (EMA Filter)"]
            WakeLock["Screen Wake Lock API"]
            AudioHaptic["Web Audio Siren & Vibration Service"]
        end
    end

    subgraph NetworkTier["Real-Time Network Gateway"]
        VercelCDN["Vercel Edge Network (HTTPS)"]
        RenderWSS["Render WSS Gateway (api.hiderush.fun)"]
    end

    subgraph BackendCore["Authoritative Game Core (Node.js & Socket.IO)"]
        RoomManager["In-Memory Room State Engine"]
        SpatialEngine["1Hz Haversine Distance & Proximity Loop"]
        GeofenceEngine["Play Zone Boundary & Shrinking Controller"]
        PacketSanitizer["Role-Based Packet Sanitizer (Anti-Cheat)"]
    end

    subgraph DatabaseTier["Persistence (Supabase PostgreSQL)"]
        SupabaseDB[("Supabase DB & Guest Auth")]
    end

    PWAManifest --> ViewportCanvas
    SafeInsetLayer --> ViewportCanvas
    SensorServices --> NetworkTier
    ViewportCanvas <--> NetworkTier
    NetworkTier <--> RenderWSS
    RenderWSS <--> BackendCore
    BackendCore --> SpatialEngine
    BackendCore --> GeofenceEngine
    BackendCore --> PacketSanitizer
    BackendCore -.->|Async Session Save| SupabaseDB
    VercelCDN --> MobileClient
```

---

## 2. Mobile Gaming Client Architecture (Next.js PWA Shell)

### 2.1 Viewport Configuration & Safe Areas
To ensure a native gaming feel and avoid browser UI collision, the application shell implements:
- **Viewport Meta:**
  ```html
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  ```
- **CSS Safe-Area Rules:**
  ```css
  :root {
    --sat: env(safe-area-inset-top);
    --sab: env(safe-area-inset-bottom);
    --sal: env(safe-area-inset-left);
    --sar: env(safe-area-inset-right);
  }
  
  /* Disable elastic overscroll bounce and touch text selection */
  html, body {
    width: 100vw;
    height: 100dvh;
    overflow: hidden;
    touch-action: manipulation;
    user-select: none;
    -webkit-user-select: none;
    background-color: #07090E;
  }
  ```

### 2.2 Layered Viewport Stacking
The mobile screen layout is composed of three strictly isolated z-index planes:

1. **Layer 0 (Base, $z = 0$): Full-Bleed Mapbox Canvas**
   - Occupies `100vw \times 100dvh`.
   - Renders GeoJSON vector tiles, player coordinate markers with smooth linear interpolation (lerp), and geofence boundary rings.
2. **Layer 1 (Middle, $z = 10$): Floating Tactical HUD Panels**
   - **Top Bar:** Floating rounded pill with backdrop-blur (`bg-neutral-900/80 border border-neutral-800 rounded-2xl`) housing remaining time, active runners count, and ping sweep indicator.
   - **Floating Indicators:** Radar ping sweep circle, zone shrinking alerts, and proximity warning banners.
3. **Layer 2 (Top, $z = 20$): Thumb-Zone Action Bar**
   - Positioned at the bottom of the screen with `margin-bottom: max(16px, env(safe-area-inset-bottom))`.
   - Hosts high-priority game actions: **"TAG RUNNER"** (Hunter) or **"INVISIBILITY CLOAK"** (Runner) and Quick Comms/Radio button.
   - Guaranteed minimum touch target of $56\text{px}$ height for effortless reach by the user's thumb while moving.

---

## 3. Play Zone (Geofence) & Shrinking Ring Architecture

To support the house rules presets (**Quick**, **Standard**, **Big Park**), the game server and client coordinate a dynamic circular geofence boundary:

```mermaid
sequenceDiagram
    autonumber
    actor Host as Room Host
    participant Server as Game Server Engine
    participant Geofence as Geofence Service
    actor Players as All Player Clients

    Host->>Server: Configure Rules (Zone Size: 500m, Shrink Interval: 3m)
    Server->>Server: Lock Zone Center Coordinate (C_lat, C_lng) from Host GPS
    Server-->>Players: emit("game:zone_init", {center, initialRadius: 500})

    loop Every Tick (1 Hz)
        Server->>Geofence: Evaluate Active Radius r(t)
        alt Shrinking Phase Active
            Geofence->>Geofence: Interpolate radius r(t) = r_prev - delta * t
            Geofence->>Server: Update current radius
        end
        Geofence->>Players: emit("game:tick", {zoneRadius: r(t)})
        
        Players->>Players: Update Mapbox GeoJSON Circle Layer
        
        Server->>Geofence: Check Player Coordinates vs Zone Center
        alt Player Distance > r(t) (Out of Bounds)
            Server-->>Players: emit("game:out_of_bounds_warning", {userId})
        end
    end
```

---

## 4. Location Synchronization & Asymmetric Packet Filtering

The 1Hz spatial game loop sanitizes outgoing packets based on role and active abilities:

```mermaid
sequenceDiagram
    autonumber
    actor Runner as Runner Device
    actor Hunter as Hunter Device
    participant Server as Socket.IO Backend Core
    participant Spatial as Spatial & Haversine Engine

    Runner->>Server: emit("location:update", {lat, lng, accuracy})
    Hunter->>Server: emit("location:update", {lat, lng, accuracy})

    Note over Server,Spatial: 1 Hz Authoritative Tick Loop
    Server->>Spatial: Run pairwise distance calculations
    
    alt Runner within 10m of Hunter (and visible)
        Spatial->>Server: Flag 10m Hunter Proximity Alarm
        Server-->>Hunter: emit("game:proximity_alarm", {duration: 10})
        Note over Runner: Runner receives ZERO alert
    end

    alt Runner activated Invisibility Cloak
        Spatial->>Server: Strip Runner coordinates from Hunter broadcast
    end

    Server-->>Hunter: emit("game:tick", {hunters, visibleRunners})
    Server-->>Runner: emit("game:tick", {hunters, allRunners})
```

---

## 5. Client State Management Architecture (Zustand)

Client state is segregated into decoupled stores to isolate UI rendering from high-frequency sensor ticks:

```
┌─────────────────────────────────────────────────────────────┐
│                      Client State Stores                    │
├──────────────────────────────┬──────────────────────────────┤
│ `useSessionStore`            │ `useGameStore`               │
│ - Guest UUID & JWT           │ - Match Phase (LOBBY/ACTIVE) │
│ - Callsign & Avatar          │ - Game Timer & Ping Clock    │
│ - Socket connection status   │ - Role (HUNTER / RUNNER)     │
│                              │ - Remaining Runners count    │
├──────────────────────────────┼──────────────────────────────┤
│ `useGeoStore` (Throttled)    │ `useMechanicsStore`          │
│ - Local GPS lat, lng, acc    │ - Proximity Alarm (Active)   │
│ - Device Heading (Compass)   │ - Invisibility Cooldown (s)  │
│ - Signal Health (Green/Red)  │ - Catch Availability (Bool)  │
└──────────────────────────────┴──────────────────────────────┘
```

---

## 6. Hardware Web API Integration Architecture

1. **Screen Wake Lock API (`useWakeLock`):**
   - Automatically requests `navigator.wakeLock.request('screen')` on mounting the Lobby or Game screen.
   - Binds to `document.addEventListener('visibilitychange')` to immediately re-acquire lock when switching back from notification shade or another app.
2. **Web Audio Siren (`AudioService`):**
   - Instantiates a persistent `AudioContext` on the first user tap on the Home screen ("Host" or "Join").
   - Generates dual-tone synthetic square-wave alarm bursts on demand, avoiding audio loading latency or autoplay policy blocks.
3. **Vibration Feedback (`VibrationService`):**
   - Dispatches `navigator.vibrate([300, 200, 300, 200, 300])` for tactical haptics on Android Chrome (graceful no-op on iOS Safari).
