# FarmAlert: Comprehensive System Flow

This document details the end-to-end system flow, user interactions, and technical processes of **FarmAlert**, the City Veterinary Office (CVO) Livestock Disease Monitoring System.

---

## 1. System Initialization & Authentication

### A. The Login Screen (`/login`)
* **What you see:** A secure login portal branded with the San Pablo City CVO identity.
* **How it works:** The system uses **Supabase Auth** integrated with **Google OAuth**. Because this is an internal CVO tool, it is restricted to authorized team emails.
* **When you click "Sign in with Google":**
  1. You are redirected to Google to authenticate securely.
  2. Upon successful login, you are redirected back to the system.
  3. **Background Process:** The `AuthContext` detects the login event. It fetches your public IP address (via ipify) and logs your device details directly into the `login_logs` database table.

### B. The Splash Screen
* **What happens next:** The `<SplashScreen>` component blocks the app from loading instantly. A 2-second branded cinematic animation (Green background, Shield crest, loading bar) plays.
* **Why:** This ensures all heavy assets (maps, fonts, user data) are pre-loaded in the background before the user sees the dashboard, preventing layout glitches.

---

## 2. The Dashboard (`/dashboard`)
*The central command center for the CVO. It uses cascading animations to load elements smoothly.*

### A. Top Metric Cards
* **What you see:** Four animated cards (Registered Farms, Active Cases, Active Outbreaks, Livestock Deaths).
* **How it works:** These pull aggregated sums directly from the Supabase database. They act as the "heartbeat" of the city's livestock health.

### B. The "Operational" Tab
* **What it does:** Designed for quick, day-to-day monitoring.
* **The Mini-Map:** A preview of the city map showing current hotspots.
  * **Interaction:** Clicking "Expand Map" routes the user to the full `/map` screen.
* **Field Activity Log:** A real-time scrolling feed of the latest database inserts (e.g., "New farm added", "Disease reported").
  * **How it works:** Listens to Supabase Realtime webhooks to update instantly without refreshing the page.

### C. The "Data & Analytics" Tab
* **What it does:** Designed for deep-dive reporting and historical analysis.
* **Filters:** Users can filter all charts by Time Period (7 days, 30 days, All Time), Livestock Type, or Barangay.
* **Charts & Heatmaps:** 
  * *Monthly Case & Mortality Trend:* An area chart showing the trajectory of infections.
  * *Disease Density by Barangay:* A horizontal bar chart identifying hotspot locations.
  * *Cases by Disease:* A bar chart showing the most common diseases (ASF, FMD, ND).
* **Interaction:** Hovering over any chart bar/line reveals a tooltip with exact numbers and percentages.

---

## 3. Farm Registry (`/farms`)
*The database of all livestock facilities in San Pablo City.*

* **What you see:** A table listing all farms, their owners, barangay, livestock type, and current status (Active, Temporarily Closed, Quarantine).
* **When you click "Add Farm":**
  1. A modal opens asking for farm details and geographic coordinates (Latitude/Longitude).
  2. The user can click a button to "Pick on Map," which opens a mini-map to drop a pin on the exact farm location.
  3. Saving writes a new row to the `farms` table.
* **When you click a Farm Row:** You are taken to a detailed view showing the farm's history, past disease reports, and compliance records.

---

## 4. Disease Reports & Outbreak Engine (`/reports` & `/outbreaks`)
*The core logic of the FarmAlert system.*

### A. Logging a Report
* **Interaction:** When a CVO officer receives a field report, they click "Log Report".
* **Data Entry:** They select the affected Farm, the Disease, the number of cases, and mortalities. They set the severity (Low, Medium, High, Critical).
* **Submission Process:** 
  1. The report is saved to the `reports` table.
  2. The affected farm's `health_status` is instantly updated to `Infected`.
  3. The farm's pin on the map turns from Green to Red.

### B. The Outbreak Engine
* **How it works:** When multiple high-severity reports of the same disease cluster in a specific timeframe/location, the system escalates this to an **Outbreak**.
* **When an Outbreak is declared:**
  1. It appears on the `/outbreaks` screen in bright red.
  2. The system calculates a **1km Infected Zone** (strict quarantine) and a **3km Surveillance Zone** (elevated monitoring) around the epicenter.
* **When you click "Resolve" on an Outbreak:** The zone circles are removed from the map, and the status changes to historical.

---

## 5. Geospatial Mapping (`/map`)
*The visual spatial representation of San Pablo City.*

* **What you see:** An interactive Leaflet/Mapbox canvas.
* **Map Legend & Active Incidents (Sidebar):** 
  * The sidebar is split 50/50. 
  * *Top Half:* A scrolling list of currently infected farms. Clicking one could pan the map to that specific farm (future phase).
  * *Bottom Half:* A scrolling legend explaining the pins.
* **Map Elements:**
  * **Green Pins:** Healthy, operational farms.
  * **Red Pins:** Farms with active incidents.
  * **Black Pins:** Temporarily closed farms.
  * **Red/Orange Circles:** Automated Outbreak quarantine zones overlapping the city streets.
* **Interaction:** Clicking any pin opens a popup showing the Farm Name, Barangay, Owner, and a quick summary of its health status.

---

## 6. Pest Control Compliance (`/compliance`)
*Tracks biosecurity and hygiene standards.*

* **What you see:** A log of all farm inspections.
* **When logging an evaluation:** The officer selects a farm, dates it, and assigns a status: *Compliant, Semi-Compliant, or Non-Compliant*.
* **Impact:** This data feeds directly into the Analytics tab on the Dashboard to track city-wide biosecurity health.

---

## 7. System Security & Administration (`/admin`)

### A. System Settings
* **What you see:** Toggles and input fields for system behavior.
* **How it works:** Uses dynamic UI rendering. Boolean values (`true/false`) automatically render as Toggle Switches. Numeric values render as `- / +` Steppers.
* **Interaction:** Toggling "Auto-Logout (Minutes)" adjusts the idle timer. If the CVO officer leaves the computer unattended for that duration, the system automatically logs them out to prevent unauthorized access.

### B. Audit Logs
* **What you see:** A chronological ledger of every action taken in the system.
* **How it works:** Built using Supabase PostgreSQL Database Triggers. Every time a record is INSERTED, UPDATED, or DELETED in any table, the database automatically writes a shadow record to the `audit_logs` table.
* **Why:** Provides a non-editable, tamper-proof history of who changed what data, essential for government accountability.

---

## Summary Flow: "A Day in the Life of a Report"
1. **Detection:** CVO receives a call about sick pigs in Brgy. San Cristobal.
2. **Logging:** Officer logs into FarmAlert (IP is logged). They go to `/reports` and create a "High Severity" ASF report for *CediBOY Farm*.
3. **Map Update:** On `/map`, *CediBOY Farm* instantly turns Red. It jumps to the top of the "Active Incidents" sidebar.
4. **Outbreak Trigger:** Because 2 other farms nearby reported ASF yesterday, the system flags an **Active Outbreak**.
5. **Zoning:** A 1km red circle and 3km orange circle are drawn on the map around San Cristobal.
6. **Dashboard Alert:** The Dashboard Threat Level badge changes to `Critical`.
7. **Resolution:** 30 days later, the area is cleared. The officer marks the outbreak as "Resolved". The map circles disappear, the pins turn green, and the threat level returns to `Normal`.

---

## Appendix A: Disease Severity Algorithm & Epidemiological References

FarmAlert automates the calculation of disease severity to eliminate human error and ensure standardized outbreak detection. The system uses a **Syndromic Early Warning Baseline** based on global veterinary standards.

### 1. The Core Formulas
Severity is calculated using standard epidemiological rates relative to the specific farm's total registered population (`head_count`).
* **Morbidity Rate (%)** = `(Sick Animals ÷ Total Farm Population) × 100`
* **Mortality Rate (%)** = `(Dead Animals ÷ Total Farm Population) × 100`

### 2. Algorithmic Thresholds & Justification
The automated percentage brackets are designed to catch both highly lethal diseases (like ASF) and highly contagious but less lethal diseases (like FMD).

* ?? **Critical:** Mortality > 20% **-OR-** Morbidity > 60%
  * *Justification (ASF Catch):* African Swine Fever is characterized by rapid onset and mortality rates approaching 100%. A >20% mortality trigger ensures early detection before total farm wipeout.
  * *Justification (FMD Catch):* Foot-and-Mouth Disease is highly contagious (approaching 100% morbidity) but has very low adult mortality (1-5%). The >60% morbidity trigger ensures FMD is flagged as Critical even if few animals are dying.
* ?? **Severe:** Mortality >= 6% **-OR-** Morbidity >= 30%
* ?? **Moderate:** Mortality >= 1% **-OR-** Morbidity >= 10%
* ?? **Mild:** Below Moderate thresholds (isolated cases).

### 3. Global References
The definitions and behavioral traits of these diseases used to formulate the baseline model are sourced from the **World Organisation for Animal Health (WOAH)**:
* **WOAH African Swine Fever (ASF) Guidelines:** Notes that acute forms result in high mortality approaching 100%. 
  * *Link:* [https://www.woah.org/en/disease/african-swine-fever/](https://www.woah.org/en/disease/african-swine-fever/)
* **WOAH Foot and Mouth Disease (FMD) Guidelines:** Notes that the disease is highly transmissible (morbidity near 100%) while lethality is low in adults (1-5%).
  * *Link:* [https://www.woah.org/en/disease/foot-and-mouth-disease/](https://www.woah.org/en/disease/foot-and-mouth-disease/)
* **FAO Animal Health Manuals:** Standardizes the use of Case Fatality, Morbidity, and Mortality rates for syndromic surveillance.
  * *Link:* [https://www.fao.org/animal-health/en/](https://www.fao.org/animal-health/en/)


---

## Appendix B: Technology Stack

FarmAlert is built using a modern, scalable, and real-time tech stack optimized for performance and rapid deployment.

### 1. Frontend Architecture
* **React.js:** The core JavaScript library for building the interactive user interface.
* **Vite:** The build tool and development server, ensuring lightning-fast hot module replacement and highly optimized production builds.
* **React Router DOM:** Handles seamless client-side routing (Single Page Application architecture), allowing navigation between modules without page reloads.
* **CSS Modules:** Scoped, modular CSS architecture used to prevent style leaking and maintain clean, easily updatable UI components.

### 2. Backend & Database
* **Supabase:** The open-source Backend-as-a-Service (BaaS) powering the system.
* **PostgreSQL:** The robust relational database hosted by Supabase, storing all farms, disease reports, compliance data, and audit logs.
* **Supabase Realtime:** Uses PostgreSQL logical replication via WebSockets to push live database changes to the dashboard's Activity Feed instantly.
* **Supabase Auth (Google OAuth):** Manages secure user authentication, restricting system access strictly to authorized personnel.
* **PostgreSQL Triggers:** Automated server-side SQL functions (e.g., automatically calculating disease severity and generating immutable audit logs the exact millisecond data is inserted).

### 3. Geospatial & Analytics Libraries
* **Leaflet.js (React-Leaflet):** The open-source mapping library used for the `/map` module. It handles plotting farms, rendering color-coded pins, and automatically drawing the 1km/3km outbreak radius zones based on geographical coordinates.
* **Recharts:** A composable charting library built on React components, powering the complex Data & Analytics dashboard (Area trends, Bar charts, and Stacked compliance charts).
* **Lucide-React:** The modern, lightweight SVG icon library used uniformly across the application interface.

### 4. Hosting, CI/CD & Version Control
* **Vercel:** Hosts the frontend React application, providing automated Continuous Integration / Continuous Deployment (CI/CD) directly from the GitHub repository.
* **GitHub:** Version control and source code repository.

