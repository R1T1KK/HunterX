# HIDERUSH 🏃‍♂️💨🗺️

> **Mobile-First Real-World GPS Multiplayer Hide & Seek for Smartphones (PWA).**  
> Visual & UX inspired by **SCRAM** and **Shadow Hunt**.

HIDERUSH transforms physical parks, campuses, and neighborhoods into an interactive, high-stakes multiplayer arena. Designed from the ground up as a **Progressive Web App (PWA) for mobile browsers**, it delivers a console-grade mobile gaming experience directly inside mobile Safari and mobile Chrome without requiring app store downloads.

One to three players take the role of **Hunters**, while all remaining players become **Runners (Hiders)**. Hunters utilize satellite radar, directional tracking, and proximity alerts to physically hunt down and tag Runners, while Runners employ stealth, physical evasion, and timed invisibility cloaks to survive until the round timer reaches zero.

---

## 📱 Mobile-First Gaming Philosophy

- **Engineered for Smartphones:** Designed strictly for Android smartphones (Mobile Chrome) and iPhones (Mobile Safari). Desktop support is secondary and does not compromise mobile ergonomics.
- **PWA Experience:** Add to Home Screen for a full-bleed, standalone gaming experience (`viewport-fit=cover`, zero browser bars).
- **Tactical Dark Gaming Aesthetic (SCRAM-Inspired):**
  - Pure black (`#07090E`) and charcoal (`#121620`) backgrounds.
  - High-voltage crimson/red (`#FF3B30` / `#FF4655`) and tactical amber (`#FF9500`) accents.
  - Large, bold geometric typography for effortless outdoor readability in direct sunlight.
  - Rounded tactical cards (`rounded-2xl` to `rounded-3xl`) with glowing borders and backdrop blur.
  - **Thumb-Zone Ergonomics:** Primary controls (Catch, Invisibility Cloak, Comms, Start) anchored to bottom action bars above mobile safe-area insets (`env(safe-area-inset-bottom)`).
  - Floating HUD overlays atop a dominant, full-screen Mapbox GPS map.

---

## 🎮 Five Core Mobile Screens

1. **Home Screen:** Tactical HIDERUSH hero branding, player profile card, "Host a Game" action, "Join with a Code" card, and persistent bottom navigation bar.
2. **Game Lobby Screen:** Room code display with 1-tap copy/regenerate, House Rules Presets (**Quick**, **Standard**, **Big Park**), custom rules accordion (round length, head start, pings, play zone shrinking, voice comms), role selection (Hunter / Runner / Random), live player roster with GPS lock status, and fixed bottom "START GAME" button.
3. **Gameplay Screen (Tactical Map HUD):** Full-screen ($100\text{dvh}$) Mapbox vector canvas, floating top HUD (round timer, remaining runners badge, next ping countdown), 30s head-start scatter overlay, dynamic circular play zone with shrinking visualization, floating quick comms/radio, and role-specific thumb-zone action buttons (Hunter: "TAG RUNNER", Runner: "INVISIBILITY CLOAK").
4. **Player Profile Screen:** Callsign/nickname editor, avatar customization, lifetime statistics (wins, tags, survival rate, distance covered).
5. **Game Results & Debrief Screen:** Cinematic team victory/defeat banner, match telemetry summary, MVP awards, and rematch controls.

---

## ✨ Main Features

| Feature | Description |
| :--- | :--- |
| **Private Rooms & Lobbies** | Create private rooms with 6-character codes; support up to 15 players per match. |
| **House Rules Presets** | Quick (5m / small zone), Standard (10m / medium zone), Big Park (20m / shrinking zone). |
| **Full-Screen GPS Radar** | Mapbox GL JS vector map with real-time smoothed player markers, heading, and accuracy rings. |
| **Dynamic Play Zone (Geofence)** | Configurable circular boundary with shrinking ring animations and out-of-bounds warnings. |
| **Hunter Proximity Alarm** | Private directional/proximity alert triggered exclusively on Hunter devices when a Runner enters a 10-meter radius (10s audio + vibration). Runners receive zero notification. |
| **Runner Invisibility Cloak** | Runners can vanish from Hunter radar for 15 seconds (3-minute cooldown). Handled server-side by stripping coordinates from Hunter socket packets. |
| **Server-Authoritative Catch** | Eliminates dispute: Catches are confirmed server-side using spherical distance calculation ($\le 5.0\text{ m}$) accounting for GPS margins. |
| **Screen Wake Lock & Haptics** | Native Web APIs keep the screen awake during active matches and provide haptic vibration pulses on Android devices. |

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | [Next.js](https://nextjs.org/) (React 19 / App Router) | Mobile-first responsive web client, PWA shell |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | End-to-end strict type safety |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) | Dark gaming UI, safe-area utilities, thumb-zone controls |
| **Real-Time Networking** | [Socket.IO](https://socket.io/) (Client & Server) | Bi-directional low-latency WebSocket communication |
| **Backend Server** | [Node.js](https://nodejs.org/) & [Express](https://expressjs.com/) | Authoritative game state machine, spatial 1Hz loop |
| **Database & Auth** | [Supabase](https://supabase.com/) (PostgreSQL) | Guest sessions, persistent match summaries, RLS |
| **Mapping Engine** | [Mapbox GL JS](https://www.mapbox.com/mapbox-gljs) | Vector tile rendering, custom player markers, geofence |
| **Deployment** | [Vercel](https://vercel.com/) & [Render](https://render.com/) | Frontend on Vercel CDN; WebSocket backend on Render |

---

## 📁 Project Structure (Planned)

```text
HunterX/
├── client/                   # Next.js Mobile-First PWA Application
│   ├── src/
│   │   ├── app/              # App Router: Home, Lobby, Game, Profile, Results
│   │   ├── components/       # Tactical HUD, Floating Panels, Thumb-Zone Buttons
│   │   ├── hooks/            # useGeolocation, useSocket, useWakeLock, useComms
│   │   ├── services/         # Mapbox manager, Audio/Vibration synthesizer
│   │   ├── stores/           # Zustand state stores (session, room, game, mechanics)
│   │   └── utils/            # Exponential Moving Average (EMA), Haversine math
│   ├── public/               # manifest.json, audio siren, tactical icons
│   └── tailwind.config.ts    # Dark gaming palette, safe-area utilities
├── server/                   # Node.js + Express + Socket.IO Backend
│   ├── src/
│   │   ├── engine/           # State Machine, Spatial Haversine Loop, Geofence Engine
│   │   ├── gateways/         # Socket.IO Event Handlers & Role-Based Packet Sanitizer
│   │   ├── models/           # Room, Player, Match in-memory classes
│   │   └── services/         # Supabase client, GeoService, RateLimiter
├── README.md                 # Project Overview (This Document)
├── SPEC.md                   # Primary Source of Truth Specification
├── IMPLEMENTATION_PLAN.md    # 20-Day Detailed Milestones (Mobile Tested)
├── ARCHITECTURE.md           # System & Mobile Game Architecture
├── GAME_RULES.md             # Official Rulebook & Edge Cases
├── DATABASE_SCHEMA.md        # Database Schema & RLS Policies
├── API.md                    # REST API Documentation
├── SOCKET_EVENTS.md          # Real-time WebSocket Event Catalog
├── SECURITY.md               # Anti-Cheat & Security Architecture
├── TESTING.md                # Multi-Device & Outdoor Testing Matrix
├── DEPLOYMENT.md             # Vercel, Render & Supabase Runbook
├── CHANGELOG.md              # Version History
└── AGENTS.md                 # Master Instructions for AI Agents
```

---

## 🚀 Installation & Local Development Setup (Planned)

### Prerequisites
- **Node.js**: `v20.x` or higher
- **Mapbox Access Token**: Free account at [Mapbox](https://account.mapbox.com/)
- **Supabase Project**: Free tier project at [Supabase](https://supabase.com/)

### 1. Clone & Configure Environment
```bash
git clone https://github.com/your-username/hiderush.git
cd hiderush
```

Create `client/.env.local`:
```env
NEXT_PUBLIC_SOCKET_SERVER_URL=http://localhost:4000
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_mapbox_token_here
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Create `server/.env`:
```env
PORT=4000
CORS_ORIGIN=http://localhost:3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 2. Run Locally
```bash
# Terminal 1: Backend
cd server
npm install
npm run dev

# Terminal 2: Frontend
cd client
npm install
npm run dev
```

Visit `http://localhost:3000` or open the local network IP on a mobile phone connected to the same Wi-Fi. *(Note: HTTPS is required for mobile browser Geolocation outside localhost).*

---

## 🌐 Deployment Overview

- **Frontend:** Deployed to **Vercel** with edge caching and automatic SSL (`https://hiderush.fun`).
- **Backend:** Deployed to **Render** with persistent WebSocket support (`https://api.hiderush.fun`).
- **Database:** Hosted on **Supabase** with PostgreSQL 15+ and RLS enabled.
