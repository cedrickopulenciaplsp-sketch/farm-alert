# FarmAlert: System Evaluation & Defense Presentation Script

**Project Title:**  
**FARMALERT: A WEB-BASED DISEASE SURVEILLANCE AND BIOSECURITY COMPLIANCE MONITORING SYSTEM FOR SWINE AND POULTRY FARMS IN RURAL BARANGAYS OF SAN PABLO CITY, LAGUNA**

---

## PART 1: Official Title, Tech Stack & Security Scenarios (Bago Mag-Login)

> **Action sa Screen:** Naka-display ang Login Page (`/login`)

"Good day po sa ating mga evaluators. Ang project po namin ay:

**FarmAlert: A Web-Based Disease Surveillance and Biosecurity Compliance Monitoring System for Swine and Poultry Farms in Rural Barangays of San Pablo City, Laguna.**

Binuo po ang FarmAlert para tugunan ang dalawang pangunahing pangangailangan ng City Veterinary Office:
1. **Disease Surveillance** para sa early reporting, diagnosis, at rapid containment ng mga sakit gaya ng African Swine Fever (ASF) at Avian Influenza (Bird Flu); at
2. **Biosecurity Compliance Monitoring** para sa regular na inspection ng sanitation at prevention bago pa magka-outbreak.

Bago po tayo mag-login, gusto po muna naming i-present ang aming System Architecture at Tech Stack:

### Frontend
- **React 19** na may bagong React Compiler para sa optimized rendering, at **Vite 8** para sa lightning-fast build at hot module replacement.
- Para sa geospatial at mapping, ginamit po natin ang **Leaflet** at **React-Leaflet** para i-render ang interactive OpenStreetMap at i-compute mathematically ang dynamic 1 km at 7 km quarantine buffer zones.
- Para naman sa visual analytics, ginamit po natin ang **Recharts** para sa morbidity at mortality charts.
- Naka-style po ito gamit ang **CSS Modules** at **Tailwind CSS v4** na may full dark mode at responsive mobile layout.

### Backend at Database
- Naka-architect po tayo sa **Supabase** na tumatakbo sa enterprise **PostgreSQL 15** cloud database.
- Ang core business logic natin—gaya ng automated alerts, resolution cascades, at audit logging—ay pinatatakbo ng **PL/pgSQL database triggers at stored procedures (RPCs)**.
- Para sa API layer, gumagamit po tayo ng **PostgREST** na awtomatikong nagko-compile ng queries into secure prepared statements.
- At para sa instant live updates sa mapa at reports nang hindi nagre-refresh ng browser, pinapatakbo po ito ng **Supabase Realtime via WebSockets**.

### Deployment at CI/CD
- Naka-host po ang frontend natin sa **Vercel Edge Network** na may automated CI/CD pipeline direkta mula sa aming GitHub repository.

---

### Tatlong Core Security Mechanisms Bago Mag-Login

1. **Session Timeout at Management:**  
   Kunwari po nag-login si Veterinary Inspector sa isang shared desktop computer sa City Hall para mag-encode. Pagkatapos, nagmadali siyang umalis papuntang bukid at sinara lang niya yung browser nang hindi nag-si-sign out.  
   Safe pa rin po ang system natin dahil naka-`sessionStorage` po tayo imbes na permanenteng `localStorage`. Pagkasara pa lang po ng tab o window, automatic wiped out agad ang session token.  
   At pag may sumunod na gumamit ng computer at pinindot itong Login, may setting po tayong `prompt: 'login'`. Pipilitin po ni Google na mag-authenticate ulit imbes na mag-auto-login sa account nung naunang inspector.

2. **Rate Limiting:**  
   Kunwari po may pasaway o hacker na nag-run ng bot script para mag-flood ng 1,000 pekeng reports kada minuto para pabagsakin o i-lag ang system natin.  
   Bago pa po makarating yung flood sa database, haharangin na po agad ito ng **Vercel Edge Proxy** at ng **Kong API Gateway** sa Supabase. Iba-block po yung spamming IP at magbabalik ng `HTTP 429 Too Many Requests` para tuloy-tuloy ang trabaho ng City Hall nang walang lag.

3. **Parameterized Functions at Queries:**  
   Kunwari po may sumubok mag-hack sa pamamagitan ng pag-type ng SQL injection payload sa text boxes natin—halimbawa sa report notes: nag-type siya ng `Nilalagnat ang baboy'); DROP TABLE farms; --`.  
   Dahil 100% Parameterized po ang queries natin gamit ang Supabase SDK at prepared statements (`$1, $2`), ituturing lang po ng PostgreSQL yung buong input as ordinaryong text o sentence sa loob ng notes. Walang mabuburang table at zero chance po sa SQL injection.

Bukod po diyan, whitelist-based po ang system natin gamit ang Google OAuth. Tanging ang mga Gmail accounts na in-authorize ng City Veterinarian ang makakapasok."

---

## PART 2: Admin Login, Onboarding Swine/Poultry Farms sa Rural Barangays

> **Action sa Screen:** Mag-login as Admin (`sanielken2@gmail.com`) -> Buksan ang Farm Registry (`/farms/new`)

"Ngayon po, mag-login na tayo bilang City Veterinarian (Admin).

Unang step po ay ang pagpaparehistro ng mga farms sa mga rural barangays ng lungsod. Dito sa Farm Registry, makikita niyo po ang dalawang target livestock types ng study natin: **Swine** at **Poultry**.

Pag pumili tayo ng Swine, magbubukas ang Swine Population fields. Pag Poultry, lalabas ang Poultry Details gaya ng production type (Broiler, Layer, Quail, Duck).

Pag nilagay po natin ang Gmail ng farmer dito sa Farmer Google Email, automatic na po siyang authorized sa system bilang Farmer at naka-link na agad sa farm niya.

At kapag pumili tayo ng rural barangay—halimbawa Brgy. Concepcion o Brgy. San Gabriel—automatic pong kukunin ng system ang official GPS coordinates ng Barangay Hall mula sa ating Barangay Masterlist para mag-auto-pin sa mapa, tapos pwede na lang i-drag ang pin sa eksaktong kulungan."

---

## PART 3: Farmer Mobile View (Grassroots Early Reporting)

> **Action sa Screen:** Lipat sa Window 2 na naka-mobile view at naka-login as Farmer (`/farmer-portal`)

"Tingnan naman po natin ang view sa smartphone ng Farmer sa bukid.

Dito po sa kanyang My Farm Portal, kitang-kita niya ang Barangay Disease Advisory kung ligtas ba ang barangay nila, ang kanyang My Farm Profile, at ang kanyang Biosecurity Status (Compliant o Non-Compliant).

Kunwari po may napansin siyang may sakit o namamatay na alaga. Pipindutin lang po niya itong **+ Report Sick Animals**.

Naka-lock po ang Registered Farm field sa sarili niyang farm para hindi siya makapag-report sa farm ng iba.  
Sa Suspected Disease, filtered po ito base sa alaga niya: kung babuyan siya, swine diseases lang ang lalabas; kung poultry, mga sakit lang ng manok gaya ng Bird Flu at Newcastle Disease.  
Tinawag po natin itong Suspected Disease kasi sa DA-BAI syndromic surveillance protocol, Presumptive Diagnosis pa lang ito base sa nakikitang sintomas para alam agad ng CVO kung anong protective gear at testing kits ang dadalhin sa bukid bago pa lumabas ang lab test.  
May validation din po tayo na bawal lumampas ang sick count sa registered head count ng farm niya."

> **Action sa Screen:** I-click ang Submit Report at ituro ang 4-Step Stepper sa ibaba

"Pagka-submit po ni farmer, lalabas na sa phone niya itong 4-Step Live Progress Tracker para alam niya kung na-dispatch na ang inspector at ano ang resulta ng laboratoryo nang hindi na kailangang magpabalik-balik sa City Hall."

---

## PART 4: Real-Time GIS Map (1km / 7km Quarantine Zones)

> **Action sa Screen:** Balik sa Admin Window -> I-click ang Disease Map (`/map`)

"Balik po tayo sa City Hall dashboard. Real-time po itong pumasok sa system via WebSockets nang hindi kailangang mag-refresh.

Sa ating Disease Map, automatic na naging Red Pin yung farm at nag-generate agad ang system ng dalawang GIS buffer rings gamit ang Leaflet:

1. **Yung 1 km Red Circle:** Yan po ang Infected / Quarantine Zone kung saan mahigpit na ipinagbabawal ang paglabas-masok ng mga hayop at kailangang maglagay ng checkpoint, at
2. **Yung 7 km Orange Dashed Circle:** Yan po ang Surveillance Zone kung saan imamatyagan ng CVO ang mga katabing farms sa karatig-barangay para maagapan ang pagkalat ng virus."

---

## PART 5: 4-Step Field Response SOP & Differential Diagnosis

> **Action sa Screen:** Pumunta sa Incident Response (`/outbreaks`)

"Dito naman po sa Incident Response isinasagawa ang 4-Step Field Protocol ng City Vet Office:

- **Step 1 (Dispatch Order):** Pipindutin po ng City Veterinarian ang Dispatch Inspector para mag-issue ng digital mission order sa field inspector.
- **Step 2 (Blood Sample Collection):** Pagdating ng Veterinary Inspector sa bukid at nakakuha na ng blood o swab sample, ie-encode niya dito ang date ng collection.
- **Step 3 (RADDL Laboratory Result):** Dito po ie-encode ang opisyal na resulta mula sa Regional Animal Disease Diagnostic Laboratory (RADDL):
  - Kung Negative, kusa pong mawawala ang red rings sa mapa at iki-clear ang farm.
  - Kung Positive, magiging confirmed outbreak na po ito.  
  - At paano po kung ang unang hinala ni farmer ay ASF, pero sa pagsusuri ng RADDL ay Swine Cholera pala? Meron po tayong Differential Diagnosis (Change Disease) button."

> **Action sa Screen:** Pindutin ang Differential Diagnosis button -> Piliin ang bagong sakit -> I-save

"Mapapansin niyo po sa blue banner: naka-preserve pa rin ang Initial Presumptive Report (ASF) para sa historical accuracy ng surveillance data, habang na-update na sa Definitive Confirmation (Swine Cholera) ang active incident, ang mapa, at ang portal ni farmer.

At sa **Step 4**, dahil positive ang lab result, pwede na pong i-order ng City Veterinarian ang paglalagay ng physical Quarantine Checkpoint sa 1 km zone."

---

## PART 6: Biosecurity Compliance Monitoring (Ang Pangalawang Haligi ng Title!)

> **Action sa Screen:** I-click ang Biosecurity Compliance (`/compliance`)

"Ngayon po, puntahan natin ang pangalawang haligi ng aming thesis: ang Biosecurity Compliance Monitoring.

Hindi lang po tayo naghihintay na magka-sakit ang mga hayop; layunin po ng FarmAlert na maiwasan ang outbreaks.

Dito sa Biosecurity Compliance module, nirerecord ng ating mga Veterinary Inspectors ang regular na on-site evaluation sa mga babuyan at manukan base sa DA-BAI standards:
- May gumagana bang vehicle and foot disinfection baths sa gate?
- Kumpleto ba ang perimeter fencing para hindi makapasok ang ligaw na hayop?
- Maayos ba ang waste management at regular disinfection records?

Kapag na-encode po ito ng inspector, automatic pong nagko-compute ang system kung Compliant o Non-Compliant ang farm, at kusa itong nagre-reflect sa My Farm Profile ng magsasaka para alam niya kung anong biosecurity measures ang kailangan pa niyang ayusin."

---

## PART 7: Executive Resolution, Dashboard at Audit Logs

> **Action sa Screen:** I-click ang Lift Quarantine & Resolve -> Ipakita ang Dashboard at Audit Logs

"Pagkatapos po ng required disinfection at quarantine period, tanging si City Veterinarian (Admin) lang po ang may authority na mag-click ng Lift Quarantine & Resolve.

Pagka-confirm po nito, automated database cascade po ang mangyayari:
- Maa-archive ang incident sa Case Archive,
- Magiging Resolved ang disease report,
- Babalik sa Active ang status ng farm,
- Matatanggal ang 1km at 7km rings sa Disease Map, at
- Magiging Cleared / Resolved na rin sa tracker ng farmer.

Bilang pangwakas, mayroon po tayong **Executive Dashboard** na pinapatakbo ng Recharts para sa morbidity at mortality analytics per barangay, at ang **Immutable Audit Logs** kung saan naka-record bawat galaw sa system para sa institutional accountability ng City Hall.

Yan po ang kabuuan ng **FarmAlert: A Web-Based Disease Surveillance and Biosecurity Compliance Monitoring System for Swine and Poultry Farms in Rural Barangays of San Pablo City, Laguna**.

Maraming salamat po, at handa na po kami para sa inyong mga technical questions at evaluation."
