# FarmAlert: Final Defense Action Plan & Revisions Roadmap

**Project:** FarmAlert — Web-Based Disease Surveillance & Biosecurity Compliance Monitoring System  
**Institution:** Pamantasan ng Lunsod ng San Pablo (College of Computer Studies & Technology)  
**Status:** Passed with Major Revisions  
**Target Completion:** Final Defense (3-Week Window)  
**Date Created:** October 2026  

---

## 1. Executive Summary

During the pre-oral defense, the panel recognized the strength of FarmAlert's core features (GIS mapping, real-time WebSocket feeds, automated severity rating, and biosecurity tracking). However, they issued a **Major Revision** verdict due to standard Information Systems requirements:
1. **User Accession (3-Tier RBAC):** Distinct roles for **City Veterinarian (Admin)**, **CVO Staff (Inspectors/Encoders)**, and a dedicated **Farmer Portal**.
2. **Dynamic Masterlist Management:** Dynamic "Add Barangay" capability with official coordinates (centroids/Barangay Halls).
3. **Data Transparency & UI Polish:** Visual case counts on `/reports`, separate cards per farm report on `/outbreaks`, and direct modal shortcut buttons.

This document serves as the complete technical specification, implementation roadmap, and defense strategy to achieve an outright pass with high marks in the Final Defense.

---

## 2. Panel Feedback & Resolution Matrix

| # | Panel Observation / Critique | Ground Reality / Root Cause | Final Defense Resolution |
|---|---|---|---|
| **1** | *"Sino ang admin? Bakit pareho ng access ang lahat? Dapat may user accession."* | Previously used a single authorized CVO Google OAuth tier for simplicity. | Implement **3-Tier Role-Based Access Control (RBAC)**: **Admin (City Vet)**, **CVO Staff (Inspectors)**, and **Farmer (Raisers)**. |
| **2** | *"Dapat may account si farmer para direkta siyang makapag-report ng may sakit na hayop."* | System was built strictly as an internal CVO command center. | Build a dedicated, lightweight **Farmer Portal** with farm profile, direct report submission, and local advisories. |
| **3** | *"Bakit hardcoded ang barangay? Dapat may button na mag-a-add ng barangay."* | Barangays were seeded via static SQL migrations. | Add an **"Add / Manage Barangay"** CRUD interface in the Admin module with name, classification, and GPS coordinates. |
| **4** | *"Lahat ng barangay sa Pilipinas may coordinates. Paano nalaman ng City Vet ang exact coordinates ng farm?"* | Farmer does not provide GPS numbers; the CVO inspector geotags in the field. | Add official **Latitude & Longitude** to the `barangays` table (Barangay Hall / Centroid). Use as default anchor during triage. |
| **5** | *"Nakakalito noong nag-submit ng report sa demo—walang lumabas na bagong card sa Outbreaks."* | The clustering trigger silently updated `farms_affected_count` on an existing card instead of creating a new visible card. | **One Card per Report:** Every incident creates a distinct alert card at the top with its own Blood Sampling & Lab Result SOP. |
| **6** | *"Dapat may bilang kung ilan ang may sakit na livestock sa ASF, FMD, etc."* | Removed previously because CVO noted backyard callers lack verified counts. | Restore **"Reported Cases"** & **"Mortalities"** columns in the `/reports` table (Syndromic Intake count updated upon inspection). |
| **7** | *"Ang shortcut button sa header papunta lang sa Disease Reports page, hindi nagbubukas ng form tulad ng Register Farm."* | `[📄 Disease Reports]` was just a navigation link, while `[+ Register Farm]` was a modal trigger. | Standardize header shortcuts: Change to `[+ Log Report]` which immediately triggers the New Report modal form. |

---

## 3. Detailed Technical Specification

### A. User Accession & Roles Architecture
```
                         ┌──────────────────────┐
                         │   Supabase Auth /    │
                         │   Google OAuth       │
                         └──────────┬───────────┘
                                    │
                       Check User Role (`roles`)
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         ▼                          ▼                          ▼
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│      ADMIN       │      │    CVO STAFF     │      │      FARMER      │
│(City Veterinarian│      │ (Field Inspector/│      │(Livestock Raiser/│
│    Chief Vet)    │      │     Encoder)     │      │   Smallholder)   │
├──────────────────┤      ├──────────────────┤      ├──────────────────┤
│• User Management │      │• Log/Verify      │      │• View Own Farm   │
│  (Assign Roles)  │      │  Disease Reports │      │  Profile & Status│
│• Barangay CRUD   │      │• Conduct On-Site │      │• Direct "Report  │
│  (Add/Edit Brgy) │      │  Biosecurity     │      │  Sick Animals"   │
│• Outbreak Final  │      │  Inspections     │      │• View Barangay   │
│  Declaration &   │      │• Full Map &      │      │  Outbreak Alert  │
│  Resolution      │      │  Dashboard View  │      │  Advisories      │
│• System Settings │      │• No Master Admin │      │• Strict Privacy: │
│• Full Audit Logs │      │  Privileges      │      │  No access to    │
│  Ledger          │      │                  │      │  other farms/C&C │
└──────────────────┘      └──────────────────┘      └──────────────────┘
```

### B. Dynamic Barangay Management & Georeferencing
1. **Database Schema Update:**
   ```sql
   ALTER TABLE barangays 
     ADD COLUMN IF NOT EXISTS latitude DECIMAL(9, 6),
     ADD COLUMN IF NOT EXISTS longitude DECIMAL(9, 6),
     ADD COLUMN IF NOT EXISTS contact_person VARCHAR(100),
     ADD COLUMN IF NOT EXISTS contact_number VARCHAR(20);
   ```
2. **Default Coordinates:** Seed official San Pablo City Barangay Hall / Centroid coordinates for all 80 barangays.
3. **Admin UI:** A dedicated management view under Admin/Settings to Add, Edit, or Toggle active status of barangays.
4. **Map Pan Interaction:** When selecting a Barangay in any dropdown, the Leaflet map automatically centers smoothly on that barangay's coordinates.

### C. Disease Reports Table Enhancement
1. **Restored Columns:**
   * **`AFFECTED HEADS`**: Displays formatted count (e.g., `<span class="badge-sick">15 Sick</span>`).
   * **`MORTALITIES`**: Displays formatted count (e.g., `<span class="badge-dead">3 Dead</span>`).
2. **Top Disease Counter Pills:** Quick summary cards above the table displaying aggregate numbers:
   * 🔴 **ASF:** Total affected pigs
   * 🟠 **FMD:** Total affected cattle/swine
   * 🟡 **Avian Flu / ND:** Total affected poultry

### D. Outbreak Alerts Redesign (Card-Per-Report SOP)
1. **Decoupled Workflow:** Each reported farm incident renders its own independent Outbreak Alert Card.
2. **Dedicated Testing SOP:**
   * **Step 1:** Blood Sample Collection Date (Input date).
   * **Step 2:** Laboratory Result (Dropdown: *Pending*, *Positive*, *Negative*).
3. **Dynamic Map Zoning:**
   * When Lab Result is set to **`Positive`**: Map automatically projects the **1km Quarantine Zone** and **7km Surveillance Zone** centered on that farm.
   * When Lab Result is set to **`Negative`**: Farm status restores to Healthy/Active, and alert card transitions to Cleared/Resolved.

### E. Header Shortcut Standardization
* Replace `[📄 Disease Reports]` button on the top navigation header with `[+ Log Report]`.
* Clicking `[+ Log Report]` directly triggers the `<ReportForm>` modal popup from anywhere in the app, identical to `[+ Register Farm]`.

---

## 4. Final Defense Verbal Q&A Cheatsheet

### Question 1: *"How does the City Vet know the exact coordinates of a backyard farm?"*
> **Your Defense:**  
> *"Panel, during initial phone triage, rural backyard raisers do not provide numeric GPS coordinates. Instead, they provide their registered Barangay and local landmarks. The system initially anchors the report to the **Official Barangay Centroid coordinates** stored in our masterlist. Then, during the mandatory on-site blood sampling and biosecurity inspection, the **CVO field inspector uses our mobile map picker to geotag the exact coordinates** of the pen into the registry."*

### Question 2: *"How does the City Vet estimate the number of sick livestock upon initial reporting?"*
> **Your Defense:**  
> *"Panel, the headcount recorded upon initial intake follows the **CVO's Syndromic Intake Protocol**. During the triage call, veterinary officers ask the raiser three standardized questions: total registered population, number of animals showing visible clinical symptoms (fever, discoloration, loss of appetite), and observed deaths. This reported count gives the CVO the vital baseline to dispatch the exact quantity of PPE, syringes, and vacutainer blood collection tubes needed for the field team."*

### Question 3: *"Why did you separate the outbreak cards instead of grouping them by barangay?"*
> **Your Defense:**  
> *"While spatial containment zones apply to the whole barangay, **laboratory diagnostics are farm-specific**. Each farm has its own inspection date, blood sample collection schedule, and diagnostic test result. By tracking each farm report independently, CVO officers can record if Farm A tests Positive while Farm B in the same barangay tests Negative, preventing false quarantines and ensuring accurate epidemiological auditing."*

---

## 5. Three-Week Implementation Roadmap

```
Week 1: UI Polish & Masterlist CRUD
├── Day 1: Standardize Header Shortcut buttons ([+ Log Report] modal trigger)
├── Day 2: Restore Cases & Mortalities columns + Summary pills on /reports
├── Day 3: Decouple Outbreak Alerts (Card-per-report with independent SOP)
└── Day 4-5: Add "Manage Barangays" CRUD UI + seed official San Pablo coordinates

Week 2: User Accession & Farmer Portal
├── Day 6-7: Implement 3-Tier Role Routing (Admin vs. Staff vs. Farmer)
├── Day 8-9: Build lightweight, mobile-responsive Farmer Portal view
└── Day 10: End-to-end testing of permissions and report workflows

Week 3: Paper Revisions & Defense Rehearsal
├── Day 11-14: Update Manuscript (Chapter 3 Use Case, Role Hierarchy, SOP Diagrams)
├── Day 15-17: Comprehensive UAT verification & backup deployment checks
└── Day 18-21: Presentation Slide deck alignment & live mock demo rehearsal
```

---

*This action plan directly addresses every comment from the panel while preserving 100% of the research integrity and operational realism of the City Veterinary Office.*
