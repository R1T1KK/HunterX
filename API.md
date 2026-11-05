# API.md — HIDERUSH RESTful API Specification

> **Base URL (Local):** `http://localhost:4000/api/v1`  
> **Base URL (Production):** `https://api.hiderush.fun/api/v1`  
> **Protocol:** HTTPS with JSON Payloads  
> **Status:** APPROVED API SPECIFICATION  

---

## 1. Authentication & Session Model

HIDERUSH uses lightweight guest sessions for instant access.
Upon first visiting the application, the client sends a handshake request to receive a `guestToken` (a signed JWT containing `userId` and `isAnonymous: true`). This token is stored in client `localStorage` and passed via the `Authorization: Bearer <token>` header for all authenticated REST calls and WebSocket connection handshakes.

---

## 2. Standard Response & Error Envelope

All REST endpoints return responses wrapped in a consistent JSON structure.

### 2.1 Success Response Envelope
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2026-11-05T20:30:00Z"
}
```

### 2.2 Error Response Envelope
```json
{
  "success": false,
  "error": {
    "code": "ROOM_FULL",
    "message": "This room has reached the maximum capacity of 15 players.",
    "details": null
  },
  "timestamp": "2026-11-05T20:30:00Z"
}
```

### Standard Error Codes
| Code | HTTP Status | Description |
| :--- | :---: | :--- |
| `UNAUTHORIZED` | 401 | Missing or invalid Bearer token |
| `FORBIDDEN` | 403 | Action permitted only by Room Host |
| `NOT_FOUND` | 404 | Room code or resource not found |
| `ROOM_FULL` | 400 | Room has reached maximum capacity (15) |
| `GAME_IN_PROGRESS`| 400 | Cannot join room while match is active |
| `INVALID_INPUT` | 422 | Payload failed schema validation |
| `RATE_LIMITED` | 429 | Too many requests from this IP |

---

## 3. Endpoints Catalog

### 3.1 Authentication & Profile

#### `POST /auth/guest`
Generates a new anonymous guest user profile and issues a JWT.

- **Headers:** None
- **Request Body:**
```json
{
  "nickname": "SwiftFox"
}
```
- **Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "userId": "d290f1ee-6c54-4b01-90e6-d701748f0851",
    "nickname": "SwiftFox",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "timestamp": "2026-11-05T20:30:00Z"
}
```

---

### 3.2 Rooms & Lobby

#### `POST /rooms`
Creates a new private game room. The authenticated user becomes the host.

- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
```json
{
  "maxPlayers": 15
}
```
- **Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "roomId": "e301f2aa-7b65-4c02-81e7-e812859f1962",
    "roomCode": "HUNT8X",
    "hostId": "d290f1ee-6c54-4b01-90e6-d701748f0851",
    "status": "OPEN",
    "maxPlayers": 15,
    "createdAt": "2026-11-05T20:30:00Z"
  },
  "timestamp": "2026-11-05T20:30:00Z"
}
```

#### `GET /rooms/:roomCode`
Retrieves public metadata and player list for an existing room code.

- **Headers:** Optional
- **Parameters:** `roomCode` (6 alphanumeric characters)
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "roomCode": "HUNT8X",
    "status": "OPEN",
    "host": {
      "userId": "d290f1ee-6c54-4b01-90e6-d701748f0851",
      "nickname": "SwiftFox"
    },
    "playerCount": 4,
    "maxPlayers": 15,
    "players": [
      { "userId": "d290f1ee-6c54-4b01-90e6-d701748f0851", "nickname": "SwiftFox", "isHost": true },
      { "userId": "a110e3bb-1c23-4f99-90a1-b809476a0123", "nickname": "ShadowRunner", "isHost": false }
    ],
    "settings": {
      "hunterCount": 1,
      "hunterSelection": "RANDOM",
      "durationSeconds": 600
    }
  },
  "timestamp": "2026-11-05T20:30:00Z"
}
```

#### `PATCH /rooms/:roomCode/settings`
Updates game settings before starting (Host only).

- **Headers:** `Authorization: Bearer <token>`
- **Parameters:** `roomCode`
- **Request Body:**
```json
{
  "hunterCount": 2,
  "hunterSelection": "MANUAL",
  "manualHunterIds": [
    "d290f1ee-6c54-4b01-90e6-d701748f0851",
    "a110e3bb-1c23-4f99-90a1-b809476a0123"
  ],
  "durationSeconds": 900
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "roomCode": "HUNT8X",
    "settings": {
      "hunterCount": 2,
      "hunterSelection": "MANUAL",
      "durationSeconds": 900
    }
  },
  "timestamp": "2026-11-05T20:30:00Z"
}
```

---

### 3.3 Match Lifecycle & Control

#### `POST /rooms/:roomCode/start`
Triggers match commencement and initiates the 30-second countdown (Host only).

- **Headers:** `Authorization: Bearer <token>`
- **Request Body:** None
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "gameId": "c402d3cc-8a76-4d03-92f8-f923960a2073",
    "status": "COUNTDOWN",
    "countdownSeconds": 30,
    "matchDurationSeconds": 900
  },
  "timestamp": "2026-11-05T20:30:00Z"
}
```

#### `GET /games/:gameId/summary`
Fetches final post-match stats and telemetry.

- **Headers:** Optional
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "gameId": "c402d3cc-8a76-4d03-92f8-f923960a2073",
    "status": "COMPLETED",
    "winnerTeam": "HUNTERS",
    "durationSeconds": 412,
    "totalHiders": 3,
    "hidersCaught": 3,
    "participants": [
      {
        "userId": "d290f1ee-6c54-4b01-90e6-d701748f0851",
        "nickname": "SwiftFox",
        "role": "HUNTER",
        "catchesCount": 2
      }
    ]
  },
  "timestamp": "2026-11-05T20:30:00Z"
}
```

