# AGENTS.md — Master Directives & Behavioral Guardrails for AI Coding Agents

> **Audience:** AI Coding Assistants (Antigravity, Claude Code, Cursor, Copilot, etc.) & Human Collaborators  
> **Authority Level:** HIGHEST SYSTEM MANDATE  
> **Status:** ACTIVE & ENFORCED  
> **Core Identity:** HIDERUSH IS STRICTLY A MOBILE-FIRST REAL-TIME LOCATION GAME (PWA)

---

## 1. Core Purpose & Architectural Mandate

This document is the **Master Instruction File** governing all AI coding agents working on **HIDERUSH**. 
Every AI agent operating in this repository must strictly adhere to the rules, architectural patterns, and workflows defined below.

### 🚨 The Mobile-First Golden Rule
**HIDERUSH is NOT a desktop-first website.** It is an immersive mobile game engineered specifically for **Android smartphones (Mobile Chrome)** and **iPhones (Mobile Safari)**.
- Never compromise mobile UI/UX, touch ergonomics, or viewport performance to accommodate desktop layouts.
- Always implement layouts using safe-area insets (`env(safe-area-inset-*)`), thumb-zone action positioning, and touch targets of at least **$44\text{px} \times 44\text{px}$** ($56\text{px}$ for primary buttons).
- The Gameplay Screen must be a **full-bleed map canvas ($100\text{dvh}$)** with floating tactical HUD panels, **NOT a conventional web dashboard**.

---

## 2. The 18 Mandatory Agent Rules

Every agent modifying code or configuration in this project must adhere to these 18 non-negotiable rules:

1. **Always read `SPEC.md` before implementing features.** Treat `SPEC.md` as the primary functional source of truth.
2. **Read `IMPLEMENTATION_PLAN.md` before starting a milestone.** Ensure work directly aligns with the designated phase and daily objectives.
3. **Follow `ARCHITECTURE.md`.** Respect module boundaries, data flows, and layer separations.
4. **Follow `GAME_RULES.md`.** Do not introduce gameplay rules or mechanics that contradict the official rulebook.
5. **Follow `DATABASE_SCHEMA.md` and `SOCKET_EVENTS.md`.** Adhere strictly to defined table structures, column names, event names, and payload schemas.
6. **Follow `SECURITY.md` for all security-sensitive features.** Enforce server-authoritative validations and sanitization.
7. **Adhere to the Mobile-First Mandate.** Build for mobile screens first; verify safe-area insets, touch bounding boxes, and portrait viewport stability.
8. **Never modify unrelated working features.** Keep diffs surgical, isolated, and focused solely on the assigned task.
9. **Never delete existing code without explicit user approval.** Refactor deliberately; do not remove functional code or tests casually.
10. **Never hardcode API keys, tokens, or secrets.** Use `.env` variables validated by Zod or environment schemas.
11. **Never trust client-side game state.** Every catch, cooldown, location update, and role check must be validated server-side.
12. **Never mark a feature complete without mobile verification.** Every milestone must be validated on physical mobile devices or simulated mobile viewports.
13. **Update documentation when implementation changes.** If an architectural or API change is approved, update corresponding markdown files immediately.
14. **Update `CHANGELOG.md` after meaningful changes.** Maintain clean version history under `[Unreleased]`.
15. **Maintain modular, reusable, and maintainable code.** Avoid monolithic files; adhere to Single Responsibility and clean component design.
16. **Explain important architectural decisions before making major changes.** Provide technical reasoning and impact analysis to the human developer.
17. **Ask for approval before changing the agreed technology stack.** Do not swap Next.js, Express, Socket.IO, Supabase, or Mapbox without prior discussion and consent.
18. **Do not fabricate test results.** Report real test runs, genuine errors, and physical device constraints truthfully.

---

## 3. Mandatory Agent Workflow (Per Milestone)

When tasked with implementing a feature or milestone, execute this 5-stage loop:

```
[1. Read & Contextualize] -> [2. Propose & Align] -> [3. Surgical Implementation] -> [4. Test & Verify (Mobile Gate)] -> [5. Document & Log]
```

### Stage 1: Read & Contextualize
- Inspect existing files before touching them.
- Read the relevant sections of `SPEC.md`, `ARCHITECTURE.md`, `IMPLEMENTATION_PLAN.md`, and `SOCKET_EVENTS.md`.
- Identify existing functions or stores that can be reused.

### Stage 2: Propose & Align
- Present a concise, bulleted action plan to the developer.
- Highlight any ambiguities or trade-offs before writing files.

### Stage 3: Surgical Implementation
- Implement changes using clean, typed TypeScript.
- Follow the **SCRAM-inspired dark tactical gaming aesthetic** (Pure black `#07090E`, Charcoal `#121620`, Crimson `#FF3B30`/`#FF4655`, rounded cards, bold typography).
- Anchor primary actions in the thumb zone above `env(safe-area-inset-bottom)`.
- Never place backend business logic in the client, and never make real-time GPS synchronization dependent on database queries.

### Stage 4: Test & Verify (Mandatory Mobile Gate)
- Run unit tests or simulation scripts.
- Validate layouts against common mobile screen sizes (iPhone 14/15/16, Android Galaxy/Pixel).
- Check browser console for errors or warnings.
- Confirm touch targets meet the $\ge 44\text{px}$ threshold.

### Stage 5: Document & Log
- Mark completed tasks in `IMPLEMENTATION_PLAN.md`.
- Append notes to `CHANGELOG.md`.

---

## 4. Anti-Patterns to Strictly Avoid

- ❌ **Do NOT build a desktop website with a mobile breakpoint afterthought:** Build mobile-first. If a component looks like an admin dashboard or a desktop portal, redesign it into a mobile gaming card or floating HUD.
- ❌ **Do NOT place GPS distance logic on the client:** The client must NEVER report `socket.emit("caught_player", { targetId })`. It must only emit `catch:attempt`.
- ❌ **Do NOT broadcast invisible Runner coordinates to Hunters:** Never rely on the client to filter markers using `if (runner.isInvisible) return null;`. Strip the coordinates on the server.
- ❌ **Do NOT write GPS ticks directly to Supabase:** The database is NOT a high-frequency message bus. Keep 1Hz updates in server RAM.
- ❌ **Do NOT install unvetted third-party packages:** Check with the developer before adding heavy npm dependencies.
- ❌ **Do NOT claim GPS is spoof-proof:** Acknowledge mobile OS mock-location limitations and implement realistic velocity heuristics.

---

## 5. Technology Stack Reference Matrix

| Scope | Tool / Library | Constraints |
| :--- | :--- | :--- |
| **Frontend** | Next.js 14+ (App Router), React 19, TypeScript | Strict typing, Tailwind CSS, Lucide-react, PWA manifest |
| **Backend** | Node.js 20+, Express, Socket.IO 4+ | Strict TypeScript, tsx / nodemon, in-memory state |
| **Database** | Supabase (PostgreSQL 15+) | Service role key on server only, RLS enabled |
| **Mapping** | Mapbox GL JS | Vector tile source updates, GeoJSON layers, 100dvh full-bleed |
| **State** | Zustand (Client), Plain JS Objects (Server) | Separate sensor stream from React renders |

---

## 6. Communication Style

- Be direct, professional, and pragmatic.
- Speak as a Senior Software Architect and Technical Lead.
- If an instruction from the user contradicts `SPEC.md` or compromises mobile game ergonomics, politely point out the discrepancy and confirm the intended direction.
