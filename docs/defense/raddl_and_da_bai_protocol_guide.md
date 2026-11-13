# RADDL and DA-BAI Protocol Guide
**Reference for Oral Defense & Technical Walkthrough**  
**Jurisdiction:** San Pablo City, Laguna (Region IV-A CALABARZON)  

---

## 1. What is RADDL?

**RADDL** stands for **Regional Animal Disease Diagnostic Laboratory**.

It is the official laboratory arm of the **Department of Agriculture – Bureau of Animal Industry (DA-BAI)** stationed at the regional level.

For San Pablo City (and the whole province of Laguna):
* The designated regional diagnostic laboratory is **RADDL Region IV-A**, located at the **DA Regional Field Office in Lipa City, Batangas** (Marawoy).

---

## 2. Why does the CVO send samples to RADDL?

1. **Local Equipment Limitations:**  
   Most Local Government Units (LGUs) and City Veterinary Offices do not possess Biosafety Level 2/3 facilities, RT-PCR (Reverse Transcription Polymerase Chain Reaction) machines, or ELISA equipment required to confirm notifiable viral pathogens such as African Swine Fever (ASF) or Highly Pathogenic Avian Influenza (HPAI).
2. **Statutory Requirement:**  
   Under Philippine veterinary law (DA-BAI Administrative Orders), an LGU cannot legally declare an official viral outbreak or impose restrictive movement cordons solely based on clinical suspicion. A formal laboratory diagnosis from RADDL or BAI Central Laboratory (Quezon City) is legally mandatory.
3. **Field Role vs. Laboratory Role:**  
   * **CVO Role:** Rapid reporting, field triage, physical containment, blood/tissue collection, and transport under cold chain.
   * **RADDL Role:** Molecular diagnostics, viral confirmation, and issuing the official **Certificate of Laboratory Analysis**.

---

## 3. The 4-Stage Response Lifecycle in FarmAlert

To eliminate panel objections during defense, FarmAlert implements the official DA-BAI 4-stage operational lifecycle:

```
[ Stage 1: Suspected Incident ]
  * Status: Active (Suspected)
  * Authority: Farmer report or CVO intake
  * Action: Awaiting City Veterinarian's "Dispatch Inspector" order (digital mission order).
  * GIS: No quarantine rings drawn yet.

            │  (City Vet issues Dispatch Order)
            ▼
[ Stage 2: Under Investigation ]
  * Status: Acknowledged (Under Investigation)
  * Authority: Veterinary Inspector (Staff)
  * Action: Field sample collection on [Date], transport to RADDL Lipa, Batangas.
  * GIS: No quarantine rings drawn yet.

            │  (RADDL Lab Result received)
            ▼
[ Stage 3: Laboratory Confirmation ]
  * Positive: Confirmed Outbreak -> 1 km Quarantine Ring & 7 km Surveillance Ring activated.
  * Negative: Lab Cleared -> No rings. Case ready for formal closure.

            │  (Disinfection / Clean period verification)
            ▼
[ Stage 4: Executive Resolution ]
  * Status: Resolved (Case Closed)
  * Authority: City Veterinarian (Admin) ONLY
  * Action: Formal resolution, quarantine lifted, case moved to Case Archive.
```

---

## 4. Key Defense Talking Points

* **"Why is a single farm with sick animals not called an outbreak?"**  
  *Answer:* Epidemiologically and legally, a single holding exhibiting clinical signs is an *incident* or *suspected case*. An outbreak legally requires either clustering across epidemiological units or positive laboratory confirmation of a notifiable pathogen by RADDL. Labeling a single unverified farm an outbreak causes unnecessary trade panic and contradicts DA-BAI protocols.
* **"Why can staff enter lab results but not resolve the outbreak?"**  
  *Answer:* Technical staff and field inspectors handle sample collection and receive lab results from RADDL. However, declaring an outbreak, deploying police/quarantine checkpoints, and lifting quarantines are statutory police powers vested strictly in the Local Chief Executive and the City Veterinarian.
* **"Why did the map previously show 0 sick or linger with red circles?"**  
  *Answer:* The earlier build checked raw report flags without verifying lab confirmation and active alert status. In the current build, 1 km and 7 km rings are rendered strictly when RADDL confirms positive or an active checkpoint is ordered, and disappear immediately upon executive resolution.
