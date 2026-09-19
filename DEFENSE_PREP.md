# FarmAlert: Capstone Defense Preparation Guide

This document contains the most likely "Trap Questions" and loopholes a capstone panel will ask about the FarmAlert system, along with the strongest, professional defenses to use during your presentation.

---

## PART 1: Technical Loopholes

### 🧨 1. The "No Internet" Loophole
> **Panelist:** *"This is a web application. Livestock diseases happen in rural barangays where there is often zero cellular signal or WiFi. If your field inspector is in a remote area and sees ASF, they can't open your website. Doesn't this defeat the purpose of 'real-time' reporting?"*

* **Your Defense:** *"Yes, panelist. FarmAlert currently operates as a centralized command center requiring an internet connection. For Phase 1, our primary user is the CVO office staff who receive reports via radio or text from the field and encode them at the city hall. However, for Future Work, we highly recommend developing an offline-first Progressive Web App (PWA) for field inspectors, which caches their reports locally on their phone and automatically syncs to our Supabase database the moment they return to a zone with cellular signal."*

### 🧨 2. The "False Alarm & Typo" Loophole
> **Panelist:** *"Your system automatically triggers a 'Critical Outbreak' and draws a 1km quarantine zone if the mortality hits 20%. What if the CVO encoder accidentally types 500 instead of 5? Or what if a farmer lies to sabotage their competitor? You just quarantined a barangay because of a typo. Where is the human validation?"*

* **Your Defense:** *"That is a valid concern, which is exactly why our system tracks 'Status'. When a report is logged, the automated severity simply flags it for the CVO. The quarantine zones and official declarations still rely on the professional judgment of the City Veterinarian. Furthermore, our tamper-proof Audit Logs track exactly which officer encoded the report. If a typo or false report occurs, the Admin can trace exactly who encoded it, edit the record, and the automated system will instantly recalculate and remove the false outbreak zone."*

### 🧨 3. The "Who is looking?" Loophole
> **Panelist:** *"Let’s say an outbreak triggers at 11:00 PM on a Friday. The dashboard flashes red, the maps draw the circles. But the CVO office is closed. If nobody is looking at the monitor until Monday morning, your 'real-time' system just lost 2 days. How is this helpful?"*

* **Your Defense:** *"You are completely correct. A dashboard is a passive monitoring tool. While our system currently excels at spatial mapping and visual analytics during office hours, we recognized this limitation. That is why our top recommendation for system expansion is the integration of an Automated SMS Gateway (like Semaphore). In the future, critical severity triggers in the database would bypass the dashboard entirely and send an instant SMS alert directly to the City Veterinarian's personal phone, ensuring 24/7 awareness even when the office is closed."*

### 🧨 4. The Data Entry Bottleneck
> **Panelist:** *"San Pablo City has thousands of backyard hog and poultry raisers. How does that data get into your system? Is your CVO officer really going to sit there and manually click 'Add Farm' 5,000 times? That will take months."*

* **Your Defense:** *"For the scope of this prototype, we built the manual CRUD interface to demonstrate the data structure and map plotting. However, Supabase (our backend) natively supports Bulk CSV Uploads. In a real-world deployment, the CVO would simply export their existing LGU Excel registry, and we could batch-import all 5,000 farms into the database in under 10 seconds. The manual 'Add Farm' button is primarily designed for registering new, individual farms moving forward."*

### 🧨 5. The "Cover-up" Loophole
> **Panelist:** *"You claim your Audit Logs are 'tamper-proof'. But since all your CVO staff use a shared account level, what stops a corrupt CVO officer from just deleting a farm to cover up a massive outbreak, and then deleting the audit log to hide their tracks?"*

* **Your Defense:** *"Sir/Ma'am, that is exactly why the Audit Logs are powered by **PostgreSQL Database Triggers** on the backend, rather than frontend code. Because the CVO office does not have a dedicated IT staff, they only interact with the system as **Application Users** through our web interface. Our web interface does not have a 'Delete Audit Log' button. It is physically impossible for any CVO officer to erase the ledger through the app. The only way to delete an audit log is to have the master credentials to the Supabase Cloud Server. Since the CVO staff do not hold those master database keys, the audit logs remain 100% tamper-proof."*

---

## PART 2: Business & Legal Traps

### 🧨 6. The "Who Pays For It?" Trap
> **Panelist:** *"You hosted this on Vercel and Supabase using their free tiers. That's great for a college project. But what happens in 2 years when the database gets full? Is the system just going to crash? Who pays for this?"*

* **Your Defense:** *"For the scope of this prototype, the Supabase Free Tier allows up to 500MB of database storage. Since our system stores mostly text (coordinates, names, and logs) and not heavy images, 500MB can hold hundreds of thousands of records, lasting the CVO several years. If they eventually exceed this, Supabase costs a flat $25/month (around ₱1,400). We built it on this modern cloud architecture precisely because it is drastically cheaper for the LGU than buying and maintaining their own physical servers."*

### 🧨 7. The "Data Privacy Act (RA 10173)" Trap
> **Panelist:** *"Your Farm Registry collects the Farm Owner's Name, exact location, and personal cell phone number. How does your system comply with the Philippine Data Privacy Act of 2012?"*

* **Your Defense:** *"Because this is an internal command center, public citizens do not have access to the system. Access is strictly locked behind a Google OAuth whitelist, meaning only sworn government officers at the CVO can view the data. Furthermore, our database uses Row Level Security (RLS) policies, ensuring that unauthorized software or third parties cannot query the farm owners' personal information."*

### 🧨 8. The "Old Staff" Trap (User Adoption)
> **Panelist:** *"Your UI looks very modern, but government offices often have older staff members who aren't tech-savvy and prefer Microsoft Excel or paper. How do you expect them to use this without breaking it?"*

* **Your Defense:** *"That is exactly why we intentionally designed the User Interface to be extremely restrictive. We removed complicated IT features like 'Super Admin Roles' and replaced manual typing with Toggles, Steppers, and Dropdowns. The automated severity math prevents them from making calculation errors. We designed it so that if they know how to use Facebook or Google Maps, they already know how to use FarmAlert."*

## PART 3: UI/UX & System Logic Defenses (Recent Updates)

### ?? 9. The "System Settings / Threshold" Trap
> **Panelist:** *"Why do we have a System Settings page where users can change the outbreak thresholds? The Department of Agriculture (DA) already dictates that even 1 farm with disease means we are on alert. Isn't this feature nonsense?"*

* **Your Defense:** *"Sir/Ma'am, the DA protocols are strict today, but government mandates change. If we hardcoded the threshold to '1' in the source code, and the DA updates their protocol in 3 years to require '3 cases' before declaring a regional crisis, the system would immediately become obsolete. The CVO does not have an IT staff to rewrite the code. By placing the thresholds in a System Settings panel, we future-proofed the system. The CVO Director can update the logic themselves to comply with future DA policies without needing to hire a software developer."*

### ?? 10. The "Dummy Data" Trap
> **Panelist:** *"I noticed the data in your demonstration is completely fake. Are we supposed to evaluate a system based on dummy data? Will the panel accept this?"*

* **Your Defense:** *"Yes, sir/ma'am. We intentionally utilized dummy data specifically to comply with the Data Privacy Act of 2012 (RA 10173). Using real names and exact coordinates of local farmers without their explicit consent for a public capstone defense would be a direct violation of their privacy. The dummy data perfectly mirrors the structure and logic of real-world scenarios to prove the system works, while keeping us legally and ethically compliant."*

### ?? 11. The "Temporarily Closed / Soft-Delete" Logic
> **Panelist:** *"Why is there no 'Delete Farm' button? What if a farm goes bankrupt?"*

* **Your Defense:** *"We implemented a 'Temporarily Closed' status instead of a permanent delete button as a 'Soft-Delete' mechanism. In epidemiology, historical data is critical. If a farm is permanently deleted from the database, all its past outbreak history vanishes. By marking them as Temporarily Closed, we hide them from active metrics but preserve their history for future pattern analysis, and prevent rogue staff from permanently deleting records."*

### ?? 12. The "4-Minute Auto Logout" Logic
> **Panelist:** *"Why does the system automatically log me out after 4 minutes of inactivity?"*

* **Your Defense:** *"Because this system contains sensitive government intelligence and farmer PII (Personally Identifiable Information). If an officer steps away from their desk for a coffee break, anyone could walk up and steal data or falsify an outbreak report. We calculated 4 minutes as the perfect balance between user convenience and strict cybersecurity protocol."*

### ?? 13. Swine vs. Poultry Color Coding (UI/UX)
> **Panelist:** *"Why do the Swine Details and Poultry Details boxes have different colored borders?"*

* **Your Defense:** *"That is an intentional UX design choice for error prevention. Because our system allows farms to be registered as 'Both', both data entry panels render simultaneously. We assigned specific colors (warm orange for swine, cool blue for poultry) to visually separate them. This prevents cognitive overload and drastically reduces the chance of an encoder accidentally inputting swine data into the poultry fields during rapid data entry."*

### ?? 14. The "Clear Filters" Button
> **Panelist:** *"Is the 'Clear' button next to the filters really necessary?"*

* **Your Defense:** *"Yes, it is a standard UI/UX fail-safe designed to prevent 'Zero Results Panic'. When users apply multiple stacked filters, forcing them to manually reset each dropdown is poor design. The Clear button provides a one-click reset, ensuring officers don't mistakenly believe data is missing just because they forgot a hidden filter was left active."*

### ?? 15. The Farm 360� Dossier Pop-up
> **Panelist:** *"Why do we need this Farm Dossier pop-up when all this data is already saved in the database or the Edit page?"*

* **Your Defense:** *"The database stores raw data, but the Farm 360� Dossier transforms it into actionable intelligence. It acts as a complete 'medical chart' for a farm. By aggregating contact info, live head count, and chronological disease history into a single modal, the City Veterinarian can perform instant triage without losing their place on the map."*

### ?? 16. Smart Disease Filtering
> **Panelist:** *"How does the system prevent someone from reporting Avian Flu for a pig farm?"*

* **Your Defense:** *"We implemented Smart Filtering at the UI level. If an encoder selects a Swine farm, the system actively filters the disease dropdown to only show Swine diseases. If they accidentally select African Swine Fever and then switch the farm to a Poultry farm, the system automatically clears the disease selection to prevent them from submitting an impossible biological record."*

### ?? 17. The "Rate Limiting & DDoS" Trap
> **Panelist:** *"Does your system have rate limiting? What stops a hacker from running a script to spam your database with 10,000 fake disease reports and crashing the system?"*

* **Your Defense:** *"We implemented rate limiting at the infrastructure layer. Our backend is powered by Supabase, which utilizes an API Gateway (Kong) that natively rate-limits excessive requests. Furthermore, because our API is locked behind strict Row Level Security (RLS) and a Google OAuth whitelist, any unauthenticated spam requests are rejected at the edge�meaning they never even reach the database to slow it down. Finally, our frontend is hosted on Vercel, which provides automatic DDoS mitigation and IP blocking for abusive traffic."*
