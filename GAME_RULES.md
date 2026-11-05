# GAME_RULES.md — HIDERUSH Official Rulebook

> **Rulebook Version:** 1.0.0  
> **Status:** OFFICIAL GAME RULES  
> **Target Audience:** Game Designers, Software Engineers, Players  

---

## 1. Game Overview

HIDERUSH is a real-world, physical outdoor game played in parks, neighborhoods, or campuses. Players move in the physical world while tracking opponents using an interactive GPS radar on their mobile web browsers.

Players belong to one of two opposing teams:
1. **The Hunters:** The pursuers tasked with tracking down and physically tagging all Hiders before the clock runs out.
2. **The Hiders:** The evaders tasked with hiding, running, using timed invisibility cloaks, and surviving until the match timer reaches zero.

---

## 2. Room Creation & Lobby Phase

### 2.1 Room Creation & Capacity
- Any player can create a private room and becomes the **Room Host**.
- The server issues a unique **6-character alphanumeric Room Code** (e.g., `HUNT8X`).
- A room accommodates a minimum of **2 players** and a maximum of **15 players**.

### 2.2 Host Controls
The Room Host has exclusive authority to configure match parameters:
- **Hunter Count:** Select 1, 2, or 3 Hunters.
- **Hunter Selection Mode:**
  - **Manual:** Host clicks on specific players in the roster to assign them as Hunters.
  - **Random:** The server randomly picks the chosen number of Hunters when the game starts.
- **Match Duration:** Host selects game timer duration (Options: 5, 10, 15, or 20 minutes; default: 10 minutes).
- **Start Game:** Host initiates the match once all players are connected and have active GPS locks.

---

## 3. Player Roles & Asymmetry

| Role | Team | Primary Objective | Special Equipment / Abilities |
| :--- | :--- | :--- | :--- |
| **Hunter** | Hunter Team | Catch all Hiders before timer expires | - Proximity Alarm (passive 10m alert)<br>- Server-verified Catch button |
| **Hider** | Hider Team | Evade Hunters until timer reaches 00:00 | - Invisibility Cloak (active 15s / 3m CD) |
| **Spectator** | Neutral | Observe the match conclusion | - Full unmasked map view<br>- No interactive abilities |

---

## 4. Game Lifecycle & Match Flow

### 4.1 Scatter / Countdown Phase (30 Seconds)
- When the host starts the match, a mandatory **30-second Countdown** begins.
- **Hiders:** Scatter phase. Hiders run and find concealment in the playing area.
- **Hunters:** Frozen phase. Hunters must remain in place and their live map is blacked out/blurred until the 30-second countdown reaches 00:00.

### 4.2 Active Match Phase
- At 00:00 of the countdown, the main match timer begins counting down.
- Hunters gain full map visibility and begin active pursuit.
- Real-time location tracking streams at 1 Hz across all devices.

---

## 5. Core Game Mechanics

### 5.1 Hunter Proximity Alarm
- **Trigger Threshold:** When the physical distance between any Hunter and any visible Hider is **$\le 10.0\text{ meters}$**.
- **Alarm Duration:** Exactly **10 seconds** per trigger instance.
- **Sensory Feedback:** Continuous audio siren pulse and device vibration pattern (`300ms on, 200ms off`).
- **Asymmetric Knowledge Rule:**
  - **Hunter receives:** Audible siren, haptic pulse, and red pulsing HUD border.
  - **Hider receives:** **ABSOLUTELY NOTHING.** No sound, no vibration, no visual indicator.
- **Hysteresis Anti-Flicker Rule:** Once triggered, the alarm will not trigger again for that specific Hider until the distance increases to at least **$\ge 14.0\text{ meters}$** and then dips below $10.0\text{ meters}$ again.

### 5.2 Hider Invisibility Cloak
- **Activation:** Any active Hider can tap the "ACTIVATE CLOAK" action button.
- **Duration:** Exactly **15 seconds**.
- **Cooldown:** Exactly **3 minutes (180 seconds)** starting at the moment of activation.
- **Mechanical Effects:**
  - The Hider's marker is removed from all Hunter maps.
  - The Hider's coordinates are physically scrubbed from Hunter network packets.
  - The Hunter Proximity Alarm cannot trigger for this Hider while invisible.
  - The Hider continues to see their own position and other players normally.
- **Asymmetric Knowledge Rule:**
  - **Hunter receives:** **NO NOTIFICATION.** The marker simply vanishes without a sound or message.
  - **Server Authority:** The server rejects any attempt to trigger invisibility if the 180s cooldown timer has not elapsed.

### 5.3 Catch & Elimination System
- **Catch Action:** When a Hunter is in physical proximity to a Hider, the Hunter taps the on-screen "TAG" button.
- **Catch Verification:** The client sends a tag attempt to the server. The server verifies:
  1. Hunter is an active Hunter.
  2. Target player is an active Hider.
  3. Physical distance between both players is **$\le 5.0\text{ meters}$**.
- **Elimination Outcome:**
  - If valid: Hider is instantly eliminated and transitioned to **Spectator**.
  - A global room banner announces: `"[Hunter Name] caught [Hider Name]!"`.
  - The remaining Hider count decrements by 1.
  - If invalid ($> 5.0\text{ m}$): The Hunter receives a brief "Out of Range" notification.

---

## 6. Win & Loss Conditions

### 6.1 Hunter Victory
- **Condition:** All Hiders in the room are successfully caught and eliminated before the main match timer reaches `00:00`.
- **Result:** Game ends immediately with **"HUNTERS WIN"** victory banner.

### 6.2 Hider Victory
- **Condition:** The main match timer reaches `00:00` and **at least one Hider remains uncaught**.
- **Result:** Game ends immediately with **"HIDERS WIN"** victory banner.

---

## 7. Edge Cases & Resilience Rules

| Scenario | Rule & Handling |
| :--- | :--- |
| **Host Disconnects in Lobby** | Host role automatically transfers to the next longest-connected player in the room. |
| **Host Disconnects Mid-Match** | Match continues uninterrupted. Game state is preserved on the server. Host privileges for rematch transfer to the next player. |
| **Hunter Disconnects Mid-Match** | If multiple Hunters exist, match continues. If the sole Hunter disconnects, a 60-second grace timer starts. If the Hunter does not reconnect, Hiders win by forfeiture. |
| **Hider Disconnects Mid-Match** | If disconnected for $> 60\text{ seconds}$, the server marks the Hider as eliminated (forfeit) to prevent avoiding capture by closing the browser. |
| **Temporary Cellular Loss (4G/5G)** | Client attempts silent reconnection. Position is held at last known coordinate for 15 seconds before showing "Weak Signal" indicator. |
| **Simultaneous Tag & Invisibility** | Server processes events strictly by arrival timestamp. If Invisibility was accepted first, tag attempt fails. |

