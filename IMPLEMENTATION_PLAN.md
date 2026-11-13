# FarmAlert: Detailed Technical Implementation Plan
**Target:** Final Defense Revisions (3-Week Execution Blueprint)  
**System:** FarmAlert (San Pablo City Veterinary Office)  
**Framework:** React 19 + Vite + CSS Modules + Leaflet + Supabase (PostgreSQL, Realtime, Auth)  

---

## 1. Architecture Overview: The 3-Tier Hierarchy

```
                                 [ Supabase Auth ]
                                         │
                                [ Role Authorization ]
                                         │
        ┌────────────────────────────────┼────────────────────────────────┐
        ▼                                ▼                                ▼
  [ ADMIN ROLE ]                  [ STAFF ROLE ]                  [ FARMER ROLE ]
  (City Veterinarian)             (CVO Inspector/Encoder)         (Livestock Raiser)
  ├── Full Dashboard & Analytics  ├── Operational Dashboard       ├── My Farm Profile
  ├── Farm Registry (Full CRUD)   ├── Farm Registry (Add/Edit)    ├── Biosecurity Status
  ├── Disease Reports (Full)      ├── Disease Reports (Log/Audit) ├── + Report Sick Animals
  ├── Outbreak Alerts (Declare/   ├── Outbreak Alerts (Lab Input) ├── My Reports Timeline
  │   Resolve Authority)          ├── Disease Map (Field View)    └── Barangay Advisory
  ├── Disease Map (Full GIS)      ├── Biosecurity Compliance          (Localized Alert)
  ├── Biosecurity Compliance      │   (Conduct Inspection)
  ├── Barangay Masterlist CRUD    └── 🚫 No Settings, No Logs,
  ├── User Management (Roles)         No Master Barangay CRUD
  ├── System Settings
  └── Tamper-Proof Audit Logs
```

---

## 2. Phase 0: Database & Schema Updates (Supabase SQL)

### 0.1 Roles & User Profile Expansion
* **Table:** `public.users` (or `user_profiles`)
  ```sql
  ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'cvo_staff'
    CHECK (role IN ('admin', 'cvo_staff', 'farmer'));

  -- Link farmer account directly to their registered farm
  ALTER TABLE users
    ADD COLUMN IF NOT EXISTS farm_id UUID REFERENCES farms(farm_id) ON DELETE SET NULL;
  ```

### 0.2 Barangay Georeferencing & Masterlist Table
* Add GPS coordinates and administrative details to `barangays`:
  ```sql
  ALTER TABLE barangays
    ADD COLUMN IF NOT EXISTS latitude DECIMAL(9, 6),
    ADD COLUMN IF NOT EXISTS longitude DECIMAL(9, 6),
    ADD COLUMN IF NOT EXISTS contact_person VARCHAR(100),
    ADD COLUMN IF NOT EXISTS contact_number VARCHAR(20);
  ```
* Seed official coordinates for San Pablo City's 80 barangays (Barangay Hall / Centroid coordinates).

### 0.3 Outbreak Alerts Decoupling
* Update trigger so every reported farm gets its **own independent alert card and testing SOP**:
  * Decouple the grouping trigger so each qualifying disease report generates a distinct `outbreak_alerts` row linked 1-to-1 with the farm incident.

---

## 3. Phase 1: Quick Wins & Immediate UI Fixes (Days 1 – 2)

### 1.1 Fix Header Shortcut Button
* **File:** `farm-alert-frontend/src/components/layout/Navbar.jsx` (or Header component)
* **Change:**
  * Replace the navigation button `[📄 Disease Reports]` with an action trigger button: `[+ Log Report]`.
  * Clicking `[+ Log Report]` directly opens `<ReportFormModal>` from anywhere in the app, matching the behavior of `[+ Register Farm]`.

### 1.2 Restore Cases & Mortalities in Disease Reports Table
* **File:** `farm-alert-frontend/src/pages/reports/DiseaseReports.jsx`
* **Changes:**
  * Add table header: `<th className={styles.th}>Affected / Deaths</th>`.
  * Add table cell displaying:
    ```jsx
    <td className={styles.cell}>
      <span className={styles.statPrimary}>{report.cases_count ?? report.animals_affected ?? '—'} sick</span>
      {Number(report.mortalities) > 0 && (
        <span className={styles.statDanger}> • {report.mortalities} dead</span>
      )}
    </td>
    ```
  * Add aggregate disease counter pills at the top of the page:
    * 🔴 **ASF:** Total affected pigs
    * 🟠 **FMD:** Total affected cattle/swine
    * 🟡 **Avian Flu / ND:** Total affected poultry

### 1.3 Smart / Optional Coordinates in Farm Registration
* **File:** `farm-alert-frontend/src/pages/farms/FarmForm.jsx`
* **Changes:**
  * When user selects a `barangay_id`:
    1. Look up the barangay's official `latitude` and `longitude`.
    2. Automatically pre-fill the `latitude` and `longitude` fields.
    3. Center the mini-map directly on that barangay.
  * Make manual coordinate typing **strictly optional** with a helper text:  
    *"Coordinates auto-set to Barangay Hall. Drag the pin on the map to pinpoint exact pen."*

---

## 4. Phase 2: Dynamic Barangay Masterlist Module (Days 3 – 4)

### 2.1 Backend Service
* **File:** `farm-alert-frontend/src/services/barangays.js`
* Implement CRUD wrappers:
  * `getBarangays()`
  * `createBarangay({ barangay_name, classification, latitude, longitude })`
  * `updateBarangay(id, data)`
  * `toggleBarangayStatus(id, is_active)`

### 2.2 Admin Barangay Management Page
* **Route:** `/settings/barangays` (accessible only by `admin`)
* **Components:**
  * Search bar + Classification filter (Urban / Rural).
  * Table of all 80 barangays with their official GPS coordinates.
  * `[+ Add Barangay]` Button opening a modal with:
    * Barangay Name
    * Classification (Rural / Urban)
    * Interactive Mini-map coordinate picker to drop a pin on the Barangay Hall.
    * Latitude and Longitude auto-captured from pin.

---

## 5. Phase 3: Role-Based Access Control & Routing (Days 5 – 6)

### 3.1 Auth State Enhancement
* **File:** `farm-alert-frontend/src/context/AuthContext.jsx`
* Fetch user profile metadata upon login:
  ```javascript
  const userRole = profile?.role || 'cvo_staff';
  const userFarmId = profile?.farm_id || null;
  ```

### 3.2 Dynamic Sidebar Navigation
* **File:** `farm-alert-frontend/src/components/layout/Sidebar.jsx`
* Filter navigation links dynamically based on `user.role`:
  * **Admin:** All 9 items + Barangay Masterlist.
  * **CVO Staff:** Dashboard, Farms, Disease Library, Reports, Outbreaks, Disease Map, Biosecurity Compliance. *(Settings & Audit Logs hidden).*
  * **Farmer:** Redirected to `/farmer-portal` with dedicated farmer sidebar/header.

### 3.3 Protected Route Authorization
* **File:** `farm-alert-frontend/src/routes/ProtectedRoute.jsx`
* Guard admin-only routes (`/settings`, `/logs`, `/settings/barangays`) with redirect if non-admin tries to access directly.

---

## 6. Phase 4: Dedicated Farmer Portal (Mobile-First) (Days 7 – 9)

### 4.1 Route & Entry Point
* **Route:** `/farmer-portal`
* If a logged-in user has `role === 'farmer'`, they automatically land here.

### 4.2 Farmer Portal UI Components (Optimized for Smartphone Screens)
* **File:** `farm-alert-frontend/src/pages/farmer/FarmerPortal.jsx`
* **Card 1: My Farm Dossier & Biosecurity Status**
  * Farm Name, Barangay, Registered Animals.
  * Biosecurity Compliance Crest:  
    * 🟢 **Compliant** or 🔴 **Non-Compliant**
    * Inspector's latest evaluation notes and recommendations.
* **Card 2: Quick Action — Direct Disease Reporting**
  * Prominent touch-friendly button: `[+ Report Sick Livestock]`.
  * Simplified modal:
    * Farm is locked to the logged-in farmer's holding.
    * Symptoms checklist: (Loss of appetite, fever, discoloration, respiratory distress).
    * Number of sick animals, number of dead animals.
    * Landmark / Notes.
    * `Submit Report` ➔ Immediately inserts into `disease_reports` and triggers CVO notification!
* **Card 3: My Reports Live Tracker**
  * Horizontal timeline stepper for each report:
    1. *Report Submitted* ➔ 2. *CVO Notified* ➔ 3. *Inspector Dispatched (Blood Sample)* ➔ 4. *Lab Results (Pending/Cleared)*.
* **Card 4: Localized Barangay Disease Advisory**
  * If their barangay has an active outbreak:
    * Render bright advisory warning with movement quarantine instructions.
    * Otherwise displays: *"✅ No active disease alerts in your barangay."*

---

## 7. Phase 5: Outbreak Alerts Decoupling & SOP Flow (Days 10 – 11)

### 5.1 One Card Per Report
* **File:** `farm-alert-frontend/src/pages/outbreaks/OutbreakAlerts.jsx`
* Each reported farm renders its own independent card:
  * Farm Name, Barangay, Disease, Date Reported.
  * Visual badge: `Active`, `Under Lab Validation`, `Resolved`.

### 5.2 Epidemiological Testing SOP (Step-by-Step)
* **Step 1:** Blood Sample Collection Date input.
* **Step 2:** Laboratory Result Dropdown (*Pending*, *Positive*, *Negative*).
* **Action Logic:**
  * When set to **Positive**:
    * Farm status transitions to `Infected`.
    * Map projects **1km Quarantine (Red)** and **7km Surveillance (Orange)** circles around the farm.
  * When set to **Negative**:
    * Alert card marks as `Cleared`.
    * Farm health status returns to normal.

---

## 8. Phase 6: Demo Engineering & Multi-Session Support (Days 12 – 13)

### 8.1 One-Click Quick Demo Switcher (Login Screen)
* **File:** `farm-alert-frontend/src/pages/auth/Login.jsx`
* In addition to "Sign in with Google", add a **Demo Mode quick-switch panel** at the bottom of the card:
  * 👑 `[Demo as City Vet (Admin)]`
  * 🩺 `[Demo as CVO Inspector (Staff)]`
  * 👨‍🌾 `[Demo as Mang Juan (Farmer - Mobile)]`
* Eliminates the need to manually log in and out or type passwords in front of the panel!

### 8.2 Multi-Tab / Multi-Device Synchronization
* Support concurrent browser tabs without session conflicts:
  * Use `sessionStorage` fallback for demo modes so Tab 1 (Admin), Tab 2 (Staff), and Tab 3 (Farmer) can run simultaneously in the same browser.
  * Alternatively, support the **Live Mobile Demo**: Presenter A holds a physical smartphone on `farm-alert-flax.vercel.app` while the laptop runs the projector.

---

## 9. Phase 7: Live Defense Choreography & Roleplay Script (Week 3)

### Act 1: The Farmer on Mobile (Physical Smartphone / Mobile View)
* **Presenter 1:**
  > *"Panel, ipagpalagay po natin na ako si Mang Juan, isang backyard raiser sa Brgy. San Cristobal. Gamit ang aking smartphone, bubuksan ko ang FarmAlert Farmer Portal..."*
* Taps `+ Report Sick Livestock` on mobile:
  * Selects *African Swine Fever symptoms*, *5 sick pigs*.
  * Taps **Submit**.

### Act 2: CVO Staff Field Triage (Projector Screen)
* **Presenter 2:**
  > *"Dahil sa Supabase Realtime, nang hindi po ginalaw ang laptop sa projector, kusa pong lumabas ang alert card ni Mang Juan sa loob lang ng 1 segundo!"*
* Opens alert card:
  * Sets Blood Sample Date: `Oct 28, 2026`.
  * Sets Lab Result: `Positive`.

### Act 3: City Veterinarian Escalation & GIS Zoning (Projector Screen)
* **Presenter 3:**
  > *"Bilang City Veterinarian, opisyal nating ide-deklara ang containment protocol..."*
* Navigates to Disease Map:
  * Shows the **1km Quarantine Zone** and **7km Surveillance Zone** rendered automatically around the farm.
  * Navigates to Barangay Masterlist: shows all 80 barangays with official coordinates.

---

## 10. Verification & Readiness Checklist

| Category | Requirement | Defense Readiness Status |
| :--- | :--- | :---: |
| **RBAC** | Admin, Staff, and Farmer roles strictly isolated | ✅ Fully specified in Phase 3 & 4 |
| **Farmer UX** | Mobile-first portal with direct report submission | ✅ Fully specified in Phase 4 |
| **Barangay Masterlist** | "Add Barangay" CRUD + official coordinates | ✅ Fully specified in Phase 0 & 2 |
| **Smart Coordinates** | Auto-fill by Barangay, drag pin, manual optional | ✅ Fully specified in Phase 1.3 |
| **Reports Transparency** | Visible `Affected / Deaths` columns + summary pills | ✅ Fully specified in Phase 1.2 |
| **Outbreak Workflow** | One card per report + independent SOP tracking | ✅ Fully specified in Phase 5 |
| **Header Shortcut** | `[+ Log Report]` opening modal directly | ✅ Fully specified in Phase 1.1 |
| **Demo Stability** | 1-Click Demo accounts + Multi-tab / Phone sync | ✅ Fully specified in Phase 6 |
| **Manuscript** | Chapter 3 Use Case Diagram (3 actors) & RBAC matrix | ✅ Scheduled in Week 3 |
