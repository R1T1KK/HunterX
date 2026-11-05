# DEPLOYMENT.md — Production Cloud Deployment Runbook

> **Target Environment:** Multi-Cloud Edge & Container (Vercel + Render + Supabase)  
> **Status:** APPROVED DEPLOYMENT RUNBOOK  

---

## 1. Cloud Architecture Overview

| Component | Provider | Configuration | Domain / Route |
| :--- | :--- | :--- | :--- |
| **Frontend Web App** | Vercel | Next.js 14+ Edge Build, Automatic SSL | `https://hiderush.fun` |
| **Real-Time Backend** | Render | Node.js Web Service (Docker / Native), Persistent WSS | `https://api.hiderush.fun` |
| **Database & Auth** | Supabase | Managed PostgreSQL, Connection Pooler | `db.hiderush.supabase.co` |
| **Vector Map Tiles** | Mapbox | Public Vector Tile Styles | Cloud API |

---

## 2. HTTPS & Security Requirement Notice

> [!IMPORTANT]  
> **Mobile Browser Geolocation & Web APIs REQUIRE HTTPS:**  
> Modern mobile browsers (iOS Safari and Android Chrome) **strictly disable** `navigator.geolocation`, `navigator.wakeLock`, and `navigator.vibrate` when loaded over insecure HTTP (except for `localhost`). Both frontend and backend must operate with valid TLS/SSL certificates in staging and production.

---

## 3. Environment Variable Configurations

### 3.1 Frontend (`client/.env.production` / Vercel Dashboard)

| Variable | Description | Example Value |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SOCKET_SERVER_URL` | WebSocket server URL (WSS) | `https://api.hiderush.fun` |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Public Mapbox GL access token | `pk.eyJ1IjoiYWRtaW4iLCJhIjoiY2...` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project REST URL | `https://xyzproject.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public client anon key | `eyJhbGciOiJIUzI1NiIsInR5c...` |

### 3.2 Backend (`server/.env.production` / Render Dashboard)

| Variable | Description | Example Value |
| :--- | :--- | :--- |
| `NODE_ENV` | Environment identifier | `production` |
| `PORT` | Service binding port | `10000` |
| `CORS_ORIGIN` | Allowed origin for REST & Sockets | `https://hiderush.fun` |
| `SUPABASE_URL` | Supabase project REST URL | `https://xyzproject.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret backend service role key | `eyJhbGciOiJIUzI1NiIsInR5c...` |
| `JWT_SECRET` | Secret key for guest token signing | `b8f9e21...64hexchars` |

---

## 4. Step-by-Step Deployment Guide

### Step 1: Supabase Production Setup
1. Create a new Supabase project in the desired geographic region (e.g., `us-east` or `eu-west` close to primary player base).
2. Open the Supabase **SQL Editor** and execute the DDL scripts defined in `DATABASE_SCHEMA.md`.
3. Enable Row Level Security (RLS) policies on all tables.
4. Copy the Project URL, Anon Key, and Service Role Key into your secure secrets manager.

### Step 2: Render Backend Deployment
1. Connect the GitHub repository to [Render](https://render.com/).
2. Select **Web Service** $\rightarrow$ Configure runtime as **Node**.
3. Set **Root Directory** to `server`.
4. Set **Build Command**: `npm install && npm run build`.
5. Set **Start Command**: `npm run start`.
6. Add all required backend environment variables under the **Environment** tab.
7. Configure Custom Domain: `api.hiderush.fun` and follow DNS CNAME instructions to enable Render’s automatic Let's Encrypt SSL certificate.

### Step 3: Vercel Frontend Deployment
1. Import repository into [Vercel](https://vercel.com/).
2. Set **Root Directory** to `client`.
3. Framework Preset: **Next.js**.
4. Configure all `NEXT_PUBLIC_` environment variables under Project Settings.
5. Add Custom Domain: `hiderush.fun` and `www.hiderush.fun`.
6. Deploy and verify automatic SSL certificate issuance.

---

## 5. Production Verification Checklist

Before announcing the release:

- [ ] **HTTPS Verification:** Verify `https://hiderush.fun` loads with valid lock icon.
- [ ] **WSS Connection:** Inspect browser Network tab to verify WebSocket upgrades to `wss://api.hiderush.fun/socket.io/?...` with status `101 Switching Protocols`.
- [ ] **CORS Headers:** Confirm backend returns `Access-Control-Allow-Origin: https://hiderush.fun`.
- [ ] **Mapbox Tiles:** Verify satellite/tactical vector tiles render without 401 or 403 authorization errors.
- [ ] **GPS Prompt:** Confirm mobile Safari and Chrome immediately trigger the native OS location permission prompt.
- [ ] **Audio & Vibration:** Confirm audio alarm siren fires on test proximity event on both iPhone and Android.
- [ ] **Screen Wake Lock:** Verify phone does not auto-lock while in an active room.

---

## 6. Rollback & Disaster Recovery Protocol

1. **Frontend Instant Rollback:**
   - In Vercel Dashboard $\rightarrow$ Deployments $\rightarrow$ Select prior stable deployment $\rightarrow$ Click **"Instant Rollback"**. Zero downtime switch within seconds.
2. **Backend Rollback:**
   - In Render Dashboard $\rightarrow$ Deploys $\rightarrow$ Rollback to previous working commit hash.
3. **Database Migration Rollback:**
   - Always run additive migrations. If a rollback is strictly necessary, execute the corresponding `DOWN` migration script from `docs/migrations/`.

