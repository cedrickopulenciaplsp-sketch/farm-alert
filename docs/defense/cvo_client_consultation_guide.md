# CVO Client Consultation & Confirmation Guide
**Project:** FarmAlert — Livestock Disease Surveillance System  
**Client:** City Veterinary Office (CVO), San Pablo City, Laguna  
**Key Personnel:** Dr. Ken Clarence S. Saniel (City Veterinarian), CVO Technical Staff & Field Inspectors  

---

## 1. English Consultation Checklist

### A. Field Dispatch & Mission Order Protocol
* **Implementation:** When an intake report is received, it starts as a **Suspected Incident**, not an outbreak. When the City Veterinarian clicks **`Dispatch Inspector`**, the system records the dispatch timestamp as a digital mission order.
* **Questions to confirm:**
  1. *"Doc, when a disease report arrives, is staff dispatch typically handled verbally or via phone call first? Is having this digital mission order timestamp helpful for your Citizen's Charter response time metrics?"*
  2. *"What is CVO's target response window from intake to on-site inspection (e.g., 24–48 hours)?"*

### B. Separation of Powers (Admin vs. Staff)
* **Implementation:**
  * **CVO Staff (Field Inspector):** Inputs blood sample extraction dates and records official RADDL laboratory findings (`Positive` or `Negative`).
  * **City Veterinarian (Admin):** Holds sole statutory authority to dispatch inspectors, order movement checkpoints within the 1 km quarantine zone, and authorize final case resolution / quarantine lifting.
* **Questions to confirm:**
  1. *"Do field inspectors encode the RADDL lab results directly upon receipt from Lipa, or does the City Veterinarian review and encode them?"*
  2. *"Confirming that statutory powers (outbreak declaration, checkpoint ordering, quarantine lifting) are strictly reserved for the City Veterinarian."*

### C. 1 km Quarantine & 7 km Surveillance Buffer Rings (Disease Map)
* **Implementation:**
  * 1 km Red (Infected Zone) and 7 km Orange (Surveillance Zone) rings are rendered on the GIS map **only** when RADDL confirms `Positive` (or an emergency movement checkpoint is ordered).
  * Suspected or Lab-Cleared cases do not trigger rings to avoid public panic and false alarms.
  * Once the City Veterinarian lifts the quarantine, the rings disappear immediately.
* **Questions to confirm:**
  1. *"Do you strictly await RADDL positive confirmation before establishing the 1 km quarantine perimeter, or do you ever set precautionary buffer rings for critical diseases (like ASF) before lab results return?"*
  2. *"Upon quarantine lifting after disinfection, does the farm return to normal healthy surveillance status?"*

### D. Backyard Farm Registry (DA-BAI Guidelines)
* **Implementation:**
  * Farm name is optional for backyard holdings (defaults to `"[Owner Name] Backyard Holding"` per DA-BAI convention).
  * Phone number is mandatory; email is optional.
* **Questions to confirm:**
  1. *"Are the majority of livestock raisers in San Pablo City backyard raisers without registered commercial business names?"*
  2. *"Is mobile phone calling/SMS the primary contact method CVO uses for raisers?"*

### E. Active Incidents vs. Case Archive (Operational UI)
* **Implementation:** The response screen is segmented into **Active Incidents** (urgent daily triage) and **Case Archive** (permanent audit/historical storage for DILG and DA-BAI reporting).
* **Questions to confirm:**
  1. *"What is CVO's mandatory clean monitoring period following disinfection before an incident is officially deemed closed (e.g., 21 or 30 days)?"*

---

## 2. Taglish Consultation Guide (Gamitin sa pakikipag-usap kay Doc at CVO Staff)

### A. Field Dispatch at Mission Order
* *"Doc, kadalasan po ba sa CVO, phone call or verbal dispatch muna bago pumunta ang staff sa barangay? Okay po ba na may digital timestamp dito sa system para proof of compliance sa Citizen's Charter response time?"*
* *"Ilang hours o days po karaniwan ang target niyo bago makarating ang inspector sa area mula nung natanggap ang report?"*

### B. Separation of Powers (City Vet vs. Inspector)
* *"Doc, tama po ba na ang staff/inspectors ang nag-eencode ng RADDL lab result pagdating ng report galing Lipa, Batangas, o dapat si City Vet lang po ang maglalagay nito sa system?"*
* *"Naka-lock po ang Outbreak Declaration, Checkpoint Order, at Case Closure kay City Vet lang po talaga dahil statutory power po ito, tama po ba?"*

### C. 1 km at 7 km Buffer Rings sa Mapa
* *"Doc, strictly kapag RADDL confirmed positive lang po ba kayo naglalagay ng 1km quarantine ring, o may pagkakataon po ba na nagse-set kayo ng precautionary buffer zones kahit pending pa ang lab result (halimbawa kung mataas ang suspicion sa ASF)?"*
* *"Pag na-lift na po ang quarantine, tama po ba na balik sa healthy green status ang farm sa mapa?"*

### D. Backyard Raisers
* *"Karamihan po ba ng nag-aalaga ng baboy at manok sa San Pablo ay backyard raisers na walang registered farm name?"*
* *"Cell phone number po ba talaga ang main contact niyo sa mga magsasaka pag may follow-up inspection?"*

### E. Active vs. Case Archive
* *"Doc, ilang araw po karaniwan ang clean monitoring period niyo bago niyo tuluyang i-close ang isang kaso matapos ang disinfection (halimbawa 21 days o 30 days)?"*
* *"Mas pabor po ba sa inyo na nakahiwalay ang active triage sa permanent archive para hindi tambak ang screen?"*

---

## 3. Quick 3-Minute Demo Walkthrough Script

1. **Step 1: Intake ([Disease Reports])**  
   Ipakita kung paano mag-log ng sick livestock report.  
   *Narrative: "Ang system po ay nag-a-assign dito bilang Suspected Incident, hindi agad outbreak."*

2. **Step 2: Command & Dispatch ([Incident Response])**  
   Ipakita ang **Active Incidents** board. I-click ang **`Dispatch Inspector`** para ma-stamp ang digital mission order date.

3. **Step 3: Laboratory Findings (Staff Inspection)**  
   I-input ang **Blood Sample Collection Date** at pumili ng **RADDL Lab Result** (`Positive` o `Negative`).  
   Ipakita na pag `Positive`, lalabas ang 1 km at 7 km containment zones sa **Disease Map**.

4. **Step 4: Executive Resolution & Archive**  
   I-click ang **`Lift Quarantine & Resolve`** (o **`Close Case (Lab Cleared)`**).  
   Ipakita na mawawala ang red rings sa mapa at lilipat ang record sa **Case Archive** tab.
