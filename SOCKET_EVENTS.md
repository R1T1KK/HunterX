# SOCKET_EVENTS.md — Real-Time WebSocket Protocol Catalog

> **Protocol:** Socket.IO v4+ (WebSocket primary, polling fallback)  
> **Schema Enforcement:** Strict JSON schema validation on all inbound events  
> **Status:** APPROVED EVENT SPECIFICATION  

---

## 1. Connection & Authentication Handshake

When connecting, the client passes its `guestToken` inside the Socket.IO `auth` payload:
```javascript
const socket = io("https://api.hiderush.fun", {
  auth: {
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
});
```

---

## 2. Event Catalog Index

| Category | Event Name | Direction | Summary |
| :--- | :--- | :---: | :--- |
| **Room** | `room:create` | Client $\rightarrow$ Server | Host initializes a new room |
| **Room** | `room:created` | Server $\rightarrow$ Client | Confirmation of room creation with room code |
| **Room** | `room:join` | Client $\rightarrow$ Server | Player joins room with 6-char code |
| **Room** | `room:joined` | Server $\rightarrow$ Client | Confirmation of joining room with player roster |
| **Room** | `room:leave` | Client $\rightarrow$ Server | Player voluntarily departs room |
| **Room** | `room:player-joined` | Server $\rightarrow$ Client | Real-time broadcast to room when new player joins |
| **Room** | `room:player-left` | Server $\rightarrow$ Client | Real-time broadcast to room when player leaves |
| **Room** | `room:state-updated` | Server $\rightarrow$ Client | Full snapshot of room players and status |
| **Room** | `room:error` | Server $\rightarrow$ Client | Error notifications (e.g. ROOM_NOT_FOUND, ROOM_FULL) |
| **Lobby** | `lobby:settings_update` | Bidirectional | Host modifies hunter count or timer |
| **Game** | `game:start_countdown` | Server $\rightarrow$ Client | 30s scatter timer commences |
| **Game** | `game:started` | Server $\rightarrow$ Client | Active match starts; map unlocks |
| **Game** | `game:timer_tick` | Server $\rightarrow$ Client | 1-second countdown broadcast |
| **Game** | `game:ended` | Server $\rightarrow$ Client | Victory declared (Hunter / Hider) |
| **GPS** | `location:update` | Client $\rightarrow$ Server | Mobile device sends latest coordinates |
| **GPS** | `game:tick` | Server $\rightarrow$ Client | Sanitized multi-player coordinate batch |
| **Mechanics** | `game:proximity_alarm` | Server $\rightarrow$ Client | Private 10m alarm fired to Hunter |
| **Ability** | `ability:invisibility_trigger` | Client $\rightarrow$ Server | Hider requests 15s cloak |
| **Ability** | `ability:invisibility_status` | Server $\rightarrow$ Client | Invisibility countdown & cooldown state |
| **Catch** | `catch:attempt` | Client $\rightarrow$ Server | Hunter attempts to tag a nearby Hider |
| **Catch** | `catch:result` | Server $\rightarrow$ Client | Confirmation of tag or out-of-range |
| **Catch** | `player:eliminated` | Server $\rightarrow$ Client | Global room broadcast of caught Hider |

---

## 3. Detailed Event Specifications

### 3.1 Room & Lobby Events

#### `room:join`
- **Direction:** Client $\rightarrow$ Server
- **Purpose:** Associate the client socket with an existing room code.
- **Payload:**
```json
{
  "roomCode": "HUNT8X",
  "nickname": "SwiftFox"
}
```
- **Validation:** `roomCode` must be 6 alphanumeric chars; room must exist; player count $< 15$.
- **Response:** Emits `room:state` to client, or `error` with code `ROOM_FULL`.

#### `room:state`
- **Direction:** Server $\rightarrow$ Client
- **Purpose:** Full initial state synchronization upon joining or reconnecting.
- **Payload:**
```json
{
  "roomCode": "HUNT8X",
  "hostId": "user_123",
  "status": "LOBBY",
  "players": [
    { "userId": "user_123", "nickname": "SwiftFox", "isHost": true, "hasGpsLock": true },
    { "userId": "user_456", "nickname": "ShadowRunner", "isHost": false, "hasGpsLock": true }
  ],
  "settings": {
    "hunterCount": 1,
    "hunterSelection": "RANDOM",
    "durationSeconds": 600
  }
}
```

---

### 3.2 GPS & Location Synchronization

#### `location:update`
- **Direction:** Client $\rightarrow$ Server
- **Purpose:** Mobile client streams its smoothed GPS position.
- **Throttling:** Max 1 emit per second per client.
- **Payload:**
```json
{
  "lat": 37.774929,
  "lng": -122.419416,
  "accuracy": 8.5,
  "heading": 182.4,
  "speed": 2.1,
  "timestamp": 1730838600000
}
```
- **Validation:** 
  - Latitude $\in [-90, 90]$, Longitude $\in [-180, 180]$.
  - Accuracy must be $\le 25\text{ m}$.
  - Speed sanity check: delta distance / delta time must be $\le 10\text{ m/s}$ ($36\text{ km/h}$).

#### `game:tick`
- **Direction:** Server $\rightarrow$ Client
- **Purpose:** Authoritative 1-second multi-player location stream with **role-based sanitization**.
- **Payload for Hunter:**
```json
{
  "remainingSeconds": 542,
  "hunters": [
    { "userId": "user_123", "lat": 37.774929, "lng": -122.419416, "heading": 180 }
  ],
  "hiders": [
    { "userId": "user_456", "lat": 37.774980, "lng": -122.419350 }
  ]
}
```
*Note: Invisible Hiders are stripped from the `hiders` array before dispatching to Hunters.*

- **Payload for Hider:**
```json
{
  "remainingSeconds": 542,
  "hunters": [
    { "userId": "user_123", "lat": 37.774929, "lng": -122.419416, "heading": 180 }
  ],
  "hiders": [
    { "userId": "user_456", "lat": 37.774980, "lng": -122.419350 },
    { "userId": "user_789", "lat": 37.775100, "lng": -122.419200 }
  ]
}
```

---

### 3.3 Core Ability & Proximity Events

#### `game:proximity_alarm`
- **Direction:** Server $\rightarrow$ Client (Private to Hunter Socket)
- **Purpose:** Informs the Hunter that an active Hider is within 10 meters.
- **Payload:**
```json
{
  "durationSeconds": 10,
  "hiderDistanceMeters": 7.4
}
```
- **Side Effect:** Client triggers audio siren loop and device vibration for 10 seconds.
- **Security Rule:** **Never** broadcasted to Hider clients.

#### `ability:invisibility_trigger`
- **Direction:** Client $\rightarrow$ Server
- **Purpose:** Hider requests activation of invisibility cloak.
- **Payload:** `{}` (Session identity derived from socket)
- **Validation:** Player must be an active Hider; current time must be $\ge$ `cooldownUntil`.
- **Response:** Emits `ability:invisibility_status` back to requesting client.

#### `ability:invisibility_status`
- **Direction:** Server $\rightarrow$ Client (Private to Triggering Hider)
- **Payload:**
```json
{
  "isActive": true,
  "activeRemainingSeconds": 15,
  "cooldownRemainingSeconds": 180
}
```

---

### 3.4 Catch & Elimination Events

#### `catch:attempt`
- **Direction:** Client $\rightarrow$ Server
- **Purpose:** Hunter attempts to tag a Hider.
- **Payload:**
```json
{
  "targetHiderId": "user_456"
}
```
- **Validation:** Sender must be an active Hunter; target must be an active Hider.
- **Server Processing:**
  - Calculates Haversine distance between Hunter and target coordinates.
  - If $\text{distance} \le 5.0\text{ m} \rightarrow$ Success.
  - Else $\rightarrow$ Out of range.

#### `catch:result`
- **Direction:** Server $\rightarrow$ Client (Private to Hunter)
- **Payload (Success):**
```json
{
  "success": true,
  "targetHiderId": "user_456",
  "calculatedDistance": 3.8
}
```
- **Payload (Failed):**
```json
{
  "success": false,
  "reason": "OUT_OF_RANGE",
  "calculatedDistance": 8.4,
  "threshold": 5.0
}
```

#### `player:eliminated`
- **Direction:** Server $\rightarrow$ Client (Broadcast to entire Room)
- **Payload:**
```json
{
  "eliminatedUserId": "user_456",
  "eliminatedNickname": "ShadowRunner",
  "caughtByNickname": "SwiftFox",
  "remainingHiders": 2
}
```

