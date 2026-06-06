# FarmAlert — Livestock Disease Monitoring System

**FarmAlert** is a web-based livestock disease monitoring, outbreak alert, and farm registry system built for the **City Veterinary Office (CVO) of San Pablo City, Laguna**.

---

## Features

| Module | Description |
|---|---|
| **Dashboard** | Live stat cards (farms, active outbreaks, cases, mortalities) + case trend charts |
| **Farm Registry** | CRUD for all registered farms with barangay, livestock type, and status tracking |
| **Disease Library** | Reference cards for livestock diseases with CRUD management |
| **Disease Reports** | Log and track disease cases per farm with severity, mortality, and status |
| **Outbreak Alerts** | Auto-triggered alerts when case thresholds are exceeded per barangay |
| **Disease Map** | Leaflet.js interactive map plotting farms and outbreak hotspots |
| **Analytics Hub** | Charts for monthly trends, mortality rates, hotspots, and pest activity |
| **Pest Control Logs** | Record pest interventions by farm with treatment history |
| **Pest Library** | Reference library for common livestock pests |
| **System Settings** | Configure outbreak thresholds and system parameters |
| **Audit Logs** | View a history of system actions for accountability |
| **CSV Exports** | One-click export of Farms, Disease Reports, and Pest Control Logs |

---

## Tech Stack

- **Frontend:** React 18 + Vite, React Router v6, Recharts, Leaflet.js
- **Backend:** Supabase (PostgreSQL + PostgREST + Auth + Realtime)
- **Styling:** Vanilla CSS with CSS custom properties (design tokens)

---

## Getting Started

### Prerequisites
- Node.js 18+
- A Supabase project (URL + anon key)

### Setup

```bash
# 1. Install dependencies
cd farm-alert-frontend
npm install

# 2. Configure environment
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# 3. Run the database migrations
# Copy each file in farm-alert-backend/supabase/migrations/ and run in Supabase SQL Editor (in order)

# 4. Start the dev server
npm run dev
```

### Build for Production

```bash
npm run build
# Output is in the /dist folder — deploy to Vercel, Netlify, or any static host
```

---

## Deployment (Vercel)

The `vercel.json` config file is included. Just connect your GitHub repo to Vercel and set the following environment variables in the Vercel dashboard:

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon/public key |

Set the **Root Directory** to `farm-alert-frontend` and **Build Command** to `npm run build`.

---

## Database Migrations

Run these SQL files in your Supabase SQL Editor **in order** (001 → latest):

```
farm-alert-backend/supabase/migrations/
├── 001_initial_schema.sql
├── 002_rls_policies.sql
├── 003_functions_triggers.sql
├── 004_views.sql
├── 005_seed_data.sql
... (see directory for full list)
└── 021_single_account_rls_pivot.sql   ← Latest
```

---

## Project Structure

```
farm-alert-frontend/src/
├── components/          Shared UI components (Layout, Card, Button, Modal, etc.)
├── context/             AuthContext — global session state
├── pages/               Page components (Dashboard, Farms, Reports, Analytics, etc.)
├── routes/              ProtectedRoute guard
├── services/            Supabase API wrappers per module
└── utils/               Helpers (exportCsv, etc.)
```

---

*Developed for the San Pablo City Veterinary Office, Laguna, Philippines.*
