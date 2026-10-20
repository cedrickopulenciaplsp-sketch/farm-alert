# FarmAlert: Capstone Presentation Slide Deck Content
**Degree:** Bachelor of Science in Information Systems  
**Institution:** Pamantasan ng Lunsod ng San Pablo (College of Computer Studies and Technology)  
**Date:** October 2026  

---

## Slide 2: Capstone Project Title
*Replace: `< --- INSERT CAPSTONE PROJECT TITLE --->`*

### Title:
**FARMALERT: A WEB-BASED DISEASE SURVEILLANCE AND BIOSECURITY COMPLIANCE MONITORING SYSTEM FOR SWINE AND POULTRY FARMS IN RURAL BARANGAYS OF SAN PABLO CITY, LAGUNA**

* **Presenter Team:**
  * Binladen D. Macasimbar
  * Cedrick A. Opulencia
  * Franz Andrei D. Dayo
  * John Raven S. Basto
  * Ken Clarence S. Saniel
  * Mark Jhorcel R. Tibayan

---

## Slide 4: Introduction
*Replace: `[insert short introduction]`*

* **Agricultural Foundation:** Swine and poultry farming serve as vital pillars of rural food security, household livelihoods, and local economic stability in San Pablo City.
* **Persistent Biological Threats:** Recurring animal contagions such as African Swine Fever (ASF) and enteric conditions (scouring) threaten livestock populations and public food safety.
* **Current Operational Bottlenecks:** The City Veterinary Office (CVO) relies on manual logbooks, disconnected spreadsheets, and informal calls/texts, causing delayed field validations and fragmented records.
* **The Proposed Solution (FarmAlert):** A centralized, web-based platform that digitizes livestock registries, automates disease outbreak threshold alerts, maps quarantine buffer perimeters, and tracks on-farm biosecurity compliance.

---

## Slide 5: Research Locale
*Replace: `[in a bullet form]`*

* **Target Geographic Setting:** City of San Pablo, Laguna — concentrating on swine and poultry-producing rural barangays.
* **Primary Partner Agency:** City Veterinary Office (CVO) of San Pablo City.
* **Beneficiary Holdings:** Commercial livestock facilities and small-scale backyard piggery and poultry raisers.
* **Operational Command & Field Validation:**
  * **CVO Central Office:** Administrative command hub for farm profiling, alert monitoring, and geospatial data analytics.
  * **Field Inspection Sites:** Rural barangays where veterinary inspectors conduct biosecurity audits and collect blood samples (covering up to two barangays daily).
* **Regulatory Disease Buffer Zones:**
  * **1-Kilometer Quarantine Zone:** Strict movement restriction and animal containment cordon around confirmed disease epicenters.
  * **7-Kilometer Surveillance Zone:** Expanded surveillance and monitoring radius to detect secondary transmission in neighboring barangays.

---

## Slide 6: Objectives of the Study
*Under: `General Objective:` and `Specific Objectives:`*

### General Objective:
To design and develop **FarmAlert**, a web-based disease surveillance and biosecurity compliance monitoring system for swine and poultry farms in rural barangays of San Pablo City, Laguna.

### Specific Objectives:
1. **Develop** a centralized web platform exclusively for CVO personnel to digitize farm registries, disease reporting, and biosecurity compliance audits.
2. **Integrate** an automated surveillance module that triggers in-app threshold alerts and visualizes interactive 1-km quarantine and 7-km surveillance buffer maps.
3. **Create** a digital Disease and Biosecurity Reference Library to assist CVO officers during field investigations and farmer agricultural extension programs.
4. **Evaluate** the software’s performance based on the **ISO/IEC 25010** software quality standard (usability, reliability, security, and performance efficiency).
5. **Formulate** a practical deployment and implementation plan detailing cloud architecture, user training, and system turnover for the San Pablo CVO.

---

## Slide 8: Scope and Limitation
*Replace: `[in a bullet form]`*

### System Scope (Core Capabilities):
* **Target Users & Role-Based Access:** Exclusively restricted to authorized CVO personnel (City Veterinarian, livestock inspectors, administrative staff) using Role-Based Access Control (RBAC).
* **Security & Authentication:** Secured via Google OAuth email whitelist, session-based tokens, and view-only IP-address audit logging.
* **Database & Cloud Architecture:** Centralized cloud storage using Supabase (PostgreSQL) accessible via modern desktop web browsers.
* **Disease Surveillance & Analytics:** Encodes swine and poultry health incidents, renders historical disease trend charts, and displays GIS-powered spatial hotspot maps.
* **Early Warning Alert System:** Automated, real-time in-app dashboard alerts triggered when disease cases reach pre-configured CVO thresholds.
* **Biosecurity Compliance Auditing:** Digital logging of on-farm physical inspections and regulatory documentation compliance.
* **Digital Reference Library:** Built-in standardized toolkit for clinical signs, sanitation protocols, and biosecurity guidelines.

### System Limitations (Operational Boundaries):
* **No Farmer Portal:** Farm owners do not have user accounts or login access; all data encoding is handled directly by authorized CVO staff.
* **Strict Online Connectivity:** Requires an active broadband internet connection for real-time synchronization; the system does not support an offline field mode.
* **Notification Boundary:** Alerts are confined to the web dashboard and do not include third-party SMS gateways or automated email blasts to farmers.
* **No Hardware / IoT / AI Diagnostics:** Excludes physical IoT sensors, automated environmental monitors, drone imaging, and automated biological diagnostic engines.
* **Veterinary Authority:** All clinical diagnoses, severity determinations, and quarantine checkpoint enforcement remain strictly under the authority of the licensed City Veterinarian.

---

## Slide 11: Project Development
*Replace: `[insert image of methodology and explanation]`*

### Development Methodology:
**Agile Software Development Methodology**  
*An iterative and incremental approach that integrates continuous user feedback from the City Veterinary Office across six structured development cycles:*

1. **Requirements Gathering:** Needs assessment and key informant interviews with San Pablo CVO personnel to identify operational gaps in disease reporting and record management.
2. **Design:** Wireframing user interface components, modeling relational database schemas (PostgreSQL/Supabase), and defining GIS buffer zone mapping rules.
3. **Development:** Frontend engineering using React 19, Vite, and scoped CSS Modules; backend integration with Supabase, Leaflet mapping, and real-time WebSockets.
4. **Testing:** Unit, component, and user acceptance testing (UAT) to verify real-time alert triggers, map rendering, and role authentication.
5. **Deployment:** Cloud hosting on Vercel and Supabase cloud infrastructure with TLS/HTTPS encryption.
6. **Review & Feedback:** Continuous evaluation with CVO end-users using the ISO/IEC 25010 quality framework to refine system features.
