# HIDERUSH — Project Milestones & Task Tracker (TODO.md)

## Current Phase: Phase 3 — Game Engine, Presets & Shrinking Geofence
- **Day 10 Status:** ✅ **COMPLETED** (Spatial Distance Engine & 1Hz Haversine Matrix)
- **Next Milestone:** 🎯 **Day 11: Play Zone (Geofence) & Dynamic Shrinking Engine**

---

## Phase 1: Mobile PWA, Room Architecture & Core Mapbox (Days 1–5) — 100% Complete
- [x] **Day 1:** Mobile PWA Scaffolding & Dark Gaming Design System
- [x] **Day 2:** Screen 1 (Home Screen) & Room Gateway
- [x] **Day 3:** Screen 2 (Game Lobby), House Rules Presets & Role Selection
- [x] **Day 4:** Screen 3 (Full-Bleed Map Canvas), Tactical Vector Styling & Floating Controls
- [x] **Day 5:** Mobile Geolocation Intake, Dynamic Accuracy Circle & Tactical GPS Badge

---

## Phase 2: Geolocation Hardening & Real-Time Sync (Days 6–7) — 100% Complete
- [x] **Day 6:** Coordinate Smoothing (EMA) & 1Hz Network Streaming
- [x] **Day 7:** Multi-Player Marker Rendering, 60 FPS Lerp Gliding & Compass Rotation

---

## Phase 3: Game Engine, Presets & Shrinking Geofence (Days 8–11) — In Progress
- [x] **Day 8:** Authoritative Game Loop & Head-Start Scatter Countdown
- [x] **Day 9:** Role Assignment Engine & Preset Handler
- [x] **Day 10:** Spatial Distance Engine & 1Hz Haversine Matrix
  - [x] High-precision vectorized Haversine distance engine in `server/src/services/GeoService.ts` ($R = 6,371,000\text{m}$, cm-level accuracy).
  - [x] Active Hunter-to-Runner pairwise distance matrix (up to 15 concurrent players).
  - [x] Authoritative 1Hz in-memory spatial loop with overlap prevention mutex.
  - [x] Safe handling and exclusion of missing, invalid, or stale ($> 15\text{s}$) GPS coordinates.
  - [x] Zero database queries; calculations executed entirely in server RAM.
  - [x] Benchmark target $< 1.0\text{ms}$ passed ($0.016\text{ms}$ average execution time).
  - [x] 43/43 Day 10 audit assertions passing; 62/62 Vitest test suite assertions passing.
- [ ] **Day 11:** Play Zone (Geofence) & Dynamic Shrinking Engine

---

## Phase 4: Core Tactical Mechanics & Elimination (Days 12–15)
- [ ] **Day 12:** Hunter 10m Proximity Alarm Engine
- [ ] **Day 13:** Sensory Feedback & Tactical Alarm System (Haptics / Audio)
- [ ] **Day 14:** Runner Invisibility Cloak & Packet Stripping
- [ ] **Day 15:** Server Catch Validation, Thumb Tag Button & Win/Loss Conditions

---

## Phase 5: Mobile Hardware Hardening & Network Resilience (Days 16–18)
- [ ] **Day 16:** Screen Wake Lock & Backgrounding Protection
- [ ] **Day 17:** Cellular Network Handoff & Session Reconnection
- [ ] **Day 18:** Screen 4 (Player Profile), Stats & Final Polish
