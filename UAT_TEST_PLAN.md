# Farm Alert: Comprehensive UAT (User Acceptance Testing) Checklist

This is the definitive, step-by-step checklist to test **every single feature, button, and edge case** in Farm Alert before your Capstone defense. 

Check off each item `[x]` as you verify it works on your live Vercel deployment.

---

## 1. Authentication & Security
- [ ] **Login Restriction:** Try logging in with a non-whitelisted Google account. It should reject you.
- [ ] **Successful Login:** Log in with the authorized `morenongkups@gmail.com` account. It should let you in.
- [ ] **Splash Screen:** Ensure the splash screen only plays *once* per session (it should not play again if you refresh the page).
- [ ] **Session Persistence:** Close the browser tab completely, then open a new tab and go to Farm Alert. You should be logged out (proving `sessionStorage` is working).
- [ ] **Idle Timeout:** Log in, leave the computer completely untouched for exactly 4 minutes. Ensure the system automatically logs you out.

---

## 2. Dashboard & Analytics
- [ ] **Metric Cards:** Verify the 4 top metric cards (Registered Farms, Active Cases, Outbreaks, Deaths) correctly match your dummy data totals.
- [ ] **Tab Switcher:** Click between "Operational" and "Data & Analytics" tabs. Ensure they switch seamlessly.
- [ ] **Operational Map:** Check if the mini-map plots the red/orange/green zones correctly.
- [ ] **Activity Feed:** Check if the latest system activities (e.g., "Report created", "Farm added") show up in the chronological feed.
- [ ] **Analytics Filters:** In the Data & Analytics tab, try filtering by "Time Range" (e.g., Last 30 Days), "Livestock Type", and "Barangay". Ensure the charts update accordingly.
- [ ] **Chart Rendering:** Ensure the Bar Charts (Cases by Disease), Area Charts (Monthly Trends), and Stacked Bars (Status/Compliance) render without errors.

---

## 3. Farm Registry & Farm Dossier
- [ ] **List Filters:** Try searching for a specific farm by name. Try filtering the table by "Barangay" and "Status".
- [ ] **Clear Button:** Click the "Clear" button next to the filters. Ensure all filters reset and the full list returns.
- [ ] **Farm Dossier (Pill Button):** Click the "DOSSIER" button on a farm row. Ensure the 360° modal pops up with correct data, disease history, and the closing "X" works.
- [ ] **Edit Button:** Click the "EDIT" button on a farm row. It should navigate to the Farm Form.
- [ ] **Add New Farm - Coordinates:** Create a new farm. Move the map pin and verify the Latitude/Longitude numbers automatically update.
- [ ] **Add New Farm - Both Types:** Set the Livestock Type to "Both". Verify that *both* the orange Swine box and blue Poultry box appear.
- [ ] **Add New Farm - Head Count Math:** Type numbers into Male/Female Swine and Male/Female Poultry. Verify the "Total Head Count" at the top automatically calculates the sum.
- [ ] **Phone Number Limit:** Try typing letters or more than 11 digits into the Contact Number field. It should block you.
- [ ] **Soft Delete:** Edit an existing farm and change its status to "Temporarily Closed". Ensure it hides from active metric counts on the Dashboard but still exists in the registry.

---

## 4. Disease Reports (The Core Logic)
- [ ] **Smart Disease Filter (Swine):** Create a new report. Select a farm that is strictly "Swine". Open the Disease dropdown—ensure Avian Flu (Poultry diseases) are hidden.
- [ ] **Smart Disease Filter (Auto-Clear):** Select a "Both" farm. Select "Avian Influenza" as the disease. Now change the farm to a strictly "Swine" farm. Ensure the Disease dropdown automatically clears itself to prevent an impossible record.
- [ ] **Head Count Validation:** Try to report 150 "Animals Affected" when the selected farm only has a total head count of 100. Ensure the system blocks it and shows an error.
- [ ] **Mortality Validation:** Try to report 50 "Mortalities" when only 10 animals are affected. Ensure the system blocks it and shows an error.
- [ ] **Severity Auto-Calculation:** Submit a report with 0 mortalities. Submit a second report with 20% mortalities. Verify the database automatically assigns them "Mild" and "Critical" severity statuses, respectively.

---

## 5. Disease Map
- [ ] **Map Rendering:** Open the Disease Map. Ensure all active farms appear as pins.
- [ ] **Outbreak Zones (1km/3km):** Locate a farm with a "Critical" or "Severe" report. Ensure Leaflet draws a red 1-kilometer radius circle and a yellow 3-kilometer radius circle around it.
- [ ] **Map Popups:** Click on a farm pin on the map. Click the "View Dossier" link inside the popup and ensure the Farm 360° Dossier modal opens successfully.

---

## 6. System Settings & Audit Logs
- [ ] **Threshold Settings:** Go to System Settings. Change the Outbreak Threshold from 1 to 5. Save. Verify the setting persists.
- [ ] **Audit Log Generation:** Make any change (e.g., Edit a farm name). Go to the Audit Logs page. Verify your name, email, and the exact action were recorded chronologically.
- [ ] **Tamper-Proof Check:** Look closely at the Audit Logs page. Verify there is absolutely no "Delete", "Edit", or "Clear" button for the logs.

---

## 7. Global UI / UX
- [ ] **Dark Mode Toggle:** Click the sun/moon icon in the top right. Ensure the entire app switches perfectly (including the Swine/Poultry cards and native number spinners).
- [ ] **Navigation Buttons:** Click the new "Back to Farm Registry" outline pill button in the Farm Form. Ensure it looks like a button and works.
- [ ] **Sidebar Collapse:** If you are on a smaller screen (or make your browser window smaller), verify the sidebar collapses into a hamburger menu gracefully.
- [ ] **Form Error Banners:** Try submitting a form with missing required fields. Ensure a red error banner pops up at the top.
