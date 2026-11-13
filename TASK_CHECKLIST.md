# FarmAlert: Detailed Task-by-Task Implementation Checklist

**Project:** FarmAlert (San Pablo City Veterinary Office)  
**Target:** Final Defense Revisions Checklist  
**Timeline:** 3-Week Granular Progress Tracker  

---

## 📌 Legend & Progress Tracking
- `[ ]` **Pending** — Not yet started
- `[/]` **In Progress** — Currently being coded / tested
- `[x]` **Completed** — Built, tested, and verified

---

## 🗄️ PHASE 0: Database & Schema Migrations (Supabase SQL)
*Target: Day 1 (Foundation)*

- [x] **Task 0.1: Add User Roles & Farm Linking**
  - **File:** `farm-alert-backend/supabase/migrations/033_user_roles_and_farmer_linking.sql`
  - [x] Add `role` column to `users` table: `'admin'`, `'cvo_staff'`, `'farmer'` (default: `'cvo_staff'`).
  - [x] Add `farm_id` column to `users` table (foreign key to `farms.farm_id`) so farmer accounts are tied to their own holding.
  - [x] Update RLS policies so farmers can only read/update their own farm's records.

- [x] **Task 0.2: Add Georeferencing Columns to Barangays**
  - **File:** `farm-alert-backend/supabase/migrations/034_add_barangay_coordinates.sql`
  - [x] Add `latitude DECIMAL(9, 6)` and `longitude DECIMAL(9, 6)` to `barangays` table.
  - [x] Add `contact_person VARCHAR(100)` and `contact_number VARCHAR(20)`.

- [x] **Task 0.3: Seed Official San Pablo City Barangay Coordinates**
  - **File:** `farm-alert-backend/supabase/migrations/035_seed_barangay_coordinates.sql`
  - [x] Seed official Barangay Hall / Centroid coordinates for all 80 barangays of San Pablo City.
  - [x] Verify that every barangay row returns non-null latitude and longitude.

- [x] **Task 0.4: Decouple Outbreak Alerts Trigger**
  - **File:** `farm-alert-backend/supabase/migrations/036_decouple_outbreak_alerts.sql`
  - [x] Modify `evaluate_outbreak_trigger()` so each new disease report creates its own independent `outbreak_alerts` entry.
  - [x] Ensure the alert stores `farm_id`, `date_triggered`, `status = 'Active'`, and initializes testing SOP fields (`blood_sample_date = NULL`, `lab_result = 'Pending'`).

---

## ⚡ PHASE 1: Quick Wins & Immediate UI Polish
*Target: Days 1 – 2*

- [x] **Task 1.1: Fix Header Quick Action Shortcut Button**
  - **File:** `farm-alert-frontend/src/pages/dashboard/Dashboard.jsx`
  - [x] Replace navigation button `[📄 Disease Reports]` with action trigger button `[+ Log Report]`.
  - [x] Connect `[+ Log Report]` to open `<ReportForm>` modal directly from any screen.
  - [x] Ensure style matches `[+ Register Farm]` button (duotone plus icon, primary/secondary button styling).

- [x] **Task 1.2: Restore Cases & Mortalities in Disease Reports Table**
  - **File:** `farm-alert-frontend/src/pages/reports/DiseaseReports.jsx`
  - [x] Add table column header: `<th className={styles.th}>Affected / Deaths</th>`.
  - [x] Render data cell:
    - Format: `<span className={styles.statPrimary}>{report.cases} sick</span>`
    - Sub-badge: `{report.mortalities > 0 && <span className={styles.statDanger}> • {report.mortalities} dead</span>}`
  - [x] Ensure fallback displays `0 sick` or `—` if count is null.

- [x] **Task 1.3: Add Aggregate Disease Counter Pills at Top of Reports**
  - **File:** `farm-alert-frontend/src/pages/reports/DiseaseReports.jsx`
  - [x] Calculate total sick animals per disease from active reports.
  - [x] Render 3 summary badge pills above table:
    - 🔴 **ASF:** `X heads affected`
    - 🟠 **FMD:** `Y heads affected`
    - 🟡 **Avian Flu / ND:** `Z heads affected`

- [x] **Task 1.4: Smart / Optional Coordinates Auto-Fill**
  - **File:** `farm-alert-frontend/src/pages/farms/FarmForm.jsx`
  - [x] Add `useEffect` listener on `barangay_id` selection change.
  - [x] Auto-fill `latitude` and `longitude` fields with selected barangay's coordinates.
  - [x] Pan mini-map smoothly to the selected barangay center.
  - [x] Add helper text below inputs: *"Coordinates auto-filled from Barangay Hall. Drag the pin on the map to pinpoint exact pen."*
  - [x] Mark manual coordinate typing as optional.

---

## 🗺️ PHASE 2: Dynamic Barangay Masterlist Module
*Target: Days 3 – 4*

- [x] **Task 2.1: Barangay Service CRUD Layer**
  - **File:** `farm-alert-frontend/src/services/barangays.js`
  - [x] `getBarangays()`: Fetch all barangays ordered alphabetically.
  - [x] `createBarangay({ barangay_name, classification, latitude, longitude })`: Insert new barangay.
  - [x] `updateBarangay(id, data)`: Update barangay details & coordinates.
  - [x] `toggleBarangayStatus(id, is_active)`: Enable/disable barangay.

- [x] **Task 2.2: Admin Barangay Management Screen**
  - **File:** `farm-alert-frontend/src/pages/admin/BarangayManagement.jsx`
  - [x] Create route: `/settings/barangays`.
  - [x] Add search input (filter by name) and classification filter (Urban / Rural).
  - [x] Table displaying: Barangay Name, Classification, Latitude, Longitude, Status Badge, Actions.
  - [x] Header button: `[+ Add Barangay]`.

- [x] **Task 2.3: "Add / Edit Barangay" Modal with Mini-Map Picker**
  - **File:** `farm-alert-frontend/src/components/admin/BarangayModal.jsx`
  - [x] Form fields: Barangay Name, Classification dropdown (Rural / Urban), Contact Person, Contact Phone.
  - [x] Embed interactive Leaflet mini-map with draggable pin for Barangay Hall location.
  - [x] Form submission validation (prevent duplicate barangay names).

---

## 🔐 PHASE 3: Role-Based Access Control (RBAC) & Routing
*Target: Days 5 – 6*

- [x] **Task 3.1: Enhance Auth Context with Role State**
  - **File:** `farm-alert-frontend/src/context/AuthContext.jsx`
  - [x] Fetch user profile record on login to extract `role` and `farm_id`.
  - [x] Expose `userRole` (`'admin'`, `'cvo_staff'`, `'farmer'`) and `userFarmId` to entire app.

- [x] **Task 3.2: Dynamic Sidebar Navigation Filtering**
  - **File:** `farm-alert-frontend/src/components/layout/Sidebar.jsx`
  - [x] Filter `NAV_ITEMS` based on role:
    - **Admin:** All 9 items + *Barangay Masterlist*.
    - **CVO Staff:** Dashboard, Farms, Disease Library, Reports, Outbreaks, Disease Map, Biosecurity Compliance. *(Settings & Audit Logs hidden).*
    - **Farmer:** Custom Farmer sidebar or redirect to `/farmer-portal`.

- [x] **Task 3.3: Route Guard Protection**
  - **File:** `farm-alert-frontend/src/routes/ProtectedRoute.jsx`
  - [x] Protect `/settings`, `/logs`, `/settings/barangays`: Redirect non-admins to `/dashboard`.
  - [x] Protect `/farmer-portal`: Only accessible by `farmer` (or admin preview).

- [x] **Task 3.4: Prominent Role Badge in Header**
  - **File:** `farm-alert-frontend/src/components/layout/Navbar.jsx`
  - [x] Display color-coded role badge below user's name:
    - `City Veterinarian (Admin)`
    - `Veterinary Inspector (Staff)`
    - `Livestock Raiser (Farmer)`

---

## 👨‍🌾 PHASE 4: Dedicated Farmer Portal (Mobile-First)
*Target: Days 7 – 9*

- [x] **Task 4.1: Farmer Portal Route & Layout**
  - **File:** `farm-alert-frontend/src/pages/farmer/FarmerPortal.jsx`
  - [x] Add route `/farmer-portal` in `App.jsx`.
  - [x] Ensure mobile viewport responsive styling (`@media (max-width: 768px)`).

- [x] **Task 4.2: "My Farm Dossier & Biosecurity Status" Card**
  - [x] Display Farm Name, Barangay, Registered Animals count.
  - [x] Display Biosecurity Compliance Badge:
    - 🟢 `Compliant` or 🔴 `Non-Compliant`
  - [x] Display latest CVO inspector evaluation notes & recommendations.

- [x] **Task 4.3: Touch-Friendly "Report Sick Animals" Form**
  - **File:** `farm-alert-frontend/src/pages/farmer/FarmerPortal.jsx`
  - [x] Large touch-friendly button: `[+ Report Sick Animals]`.
  - [x] Pre-lock `farm_id` to the logged-in farmer's holding.
  - [x] Input: Number of sick animals, Number of dead animals, and Observations/Notes.
  - [x] Submit button: Inserts into `disease_reports` and triggers instant Supabase notification to CVO!

- [x] **Task 4.4: "My Reports Live Tracker" Card**
  - [x] Stepper timeline for active reports submitted by this farmer:
    - Step 1: 🟡 *Report Submitted & Received*
    - Step 2: 🔵 *Inspector Dispatched (For Blood Sampling)*
    - Step 3: 🟠 *Lab Results Pending*
    - Step 4: 🟢 *Resolved / Cleared*

- [x] **Task 4.5: Localized Barangay Disease Advisory Card**
  - [x] Query active outbreaks in the farmer's registered barangay.
  - [x] If outbreak active: Render warning card with quarantine & movement restriction guidelines.
  - [x] If no outbreak: Render peaceful status: *"✅ No active disease alerts in your barangay."*

---

## 🚨 PHASE 5: Outbreak Alerts Decoupling & SOP Flow
*Target: Days 10 – 11*

- [x] **Task 5.1: Decoupled Outbreak Card Rendering**
  - **File:** `farm-alert-frontend/src/pages/outbreaks/OutbreakAlerts.jsx`
  - [x] Render each incident report as its own independent card (no silent merging).
  - [x] Display Farm Name, Barangay, Suspected Disease, Date Detected, and Status badge.

- [x] **Task 5.2: Independent Epidemiological Testing SOP (Step 1)**
  - [x] Step 1: **Blood Sample Collection Date** (Input date field).
  - [x] Save date directly to `outbreak_alerts.blood_sample_date`.

- [x] **Task 5.3: Independent Laboratory Result (Step 2)**
  - [x] Step 2: **Lab Result Dropdown** (*Pending*, *Positive*, *Negative*).
  - [x] Save to `outbreak_alerts.lab_result`.

- [x] **Task 5.4: Dynamic GIS Zoning Activation**
  - **File:** `farm-alert-frontend/src/pages/map/DiseaseMap.jsx` & `MapWidget.jsx`
  - [x] When Lab Result is updated to **`Positive`**:
    - Farm status updates to `Infected`.
    - Map projects **1km Quarantine Zone (Red Circle)** and **7km Surveillance Zone (Orange Circle)**.
  - [x] When Lab Result is updated to **`Negative`**:
    - Farm status restores to Healthy.
    - Alert card transitions to `Cleared`.
    - No quarantine circles drawn.

---

## 🎮 PHASE 6: Demo Engineering & Multi-Session Support
*Target: Days 12 – 13*

- [x] **Task 6.1: 1-Click Demo Switcher on Login Screen**
  - **File:** `farm-alert-frontend/src/pages/auth/Login.jsx`
  - [x] Add Demo Mode quick-switch buttons below Google Sign-In:
    - `[Demo as City Vet (Admin)]`
    - `[Demo as CVO Inspector (Staff)]`
    - `[Demo as Mang Juan (Farmer)]`
  - [x] Auto-authenticate and route without needing Google password/OTP during presentation!

- [x] **Task 6.2: Multi-Tab Concurrency (No Session Conflict)**
  - [x] Use `sessionStorage` for demo role state so Tab 1 (Admin), Tab 2 (Staff), and Tab 3 (Farmer) can run simultaneously on the same laptop.
  - [x] Verify Supabase Realtime WebSocket events push across all 3 tabs without reload.

- [ ] **Task 6.3: Mobile Testing on Real Smartphone**
  - [ ] Test `farm-alert-flax.vercel.app` on an Android phone and iPhone.
  - [ ] Verify Farmer Portal layout, touch tap targets, and submission on mobile.

---

## 📖 PHASE 7: Manuscript & Defense Rehearsal
*Target: Week 3*

- [ ] **Task 7.1: Chapter 3 Use Case Diagram**
  - [ ] Add 3 Actors: City Veterinarian (Admin), CVO Staff (Inspector), and Farmer (Raiser).
  - [ ] Map use cases to each actor according to the RBAC matrix.

- [ ] **Task 7.2: Chapter 3 Role-Based Access Control (RBAC) Matrix**
  - [ ] Insert the Master Access Table into Section 3.x (System Design).

- [ ] **Task 7.3: Chapter 3 Georeferencing Process Diagram**
  - [ ] Illustrate: Phone Triage ➔ Barangay Centroid Anchor ➔ Inspector On-Site Geotag.

- [ ] **Task 7.4: Chapter 4 UI Screenshots**
  - [ ] Capture screenshots of:
    - 1. Farmer Portal (Mobile view)
    - 2. Add Barangay Modal with Mini-Map
    - 3. Updated Disease Reports Table with Affected/Deaths columns
    - 4. Outbreak Alert Card with Blood Sample & Lab Result SOP

- [ ] **Task 7.5: Live Mock Demo Rehearsal (3-Act Script)**
  - [ ] Rehearse **Act 1:** Member A submits report from mobile phone.
  - [ ] Rehearse **Act 2:** Member B receives report live on laptop screen, inputs blood sample date.
  - [ ] Rehearse **Act 3:** Member C sets Positive result, demonstrates 1km/7km zones and Barangay Masterlist.
  - [ ] Time the whole demo to be under **3 to 4 minutes**.
