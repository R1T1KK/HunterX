# CHANGELOG.md — HIDERUSH Project History

All notable changes to the HIDERUSH project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned for Milestone 1 Day 2
- Guest session generation (`/auth/guest` token issuance).
- RoomManager backend class with 6-char alphanumeric room code generation.
- Screen 1 (Home Screen) wiring to room creation/join gateway.

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
