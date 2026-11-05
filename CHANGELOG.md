# CHANGELOG.md — HIDERUSH Project History

All notable changes to the HIDERUSH project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned for Milestone 1 (Days 1–3)
- Client and server project scaffolding with strict TypeScript.
- PWA manifest (`standalone`, `portrait`, dark gaming theme).
- Guest authentication session issuance.
- Socket.IO room manager and lobby creation.
- 6-character room code generation and verification.
- Mobile Home Screen & Lobby with House Rules presets (Quick, Standard, Big Park).

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
