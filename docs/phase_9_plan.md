# Phase 9: Single Shared Account Pivot & Secure Authentication Redesign

## Background
Based on the updated architectural decisions, the FarmAlert system is transitioning to a **Single Shared Account** model to simplify IT overhead for the City Veterinary Office (CVO). 
This phase removes the standard Email/Password authentication in favor of **Google OAuth (Sign in with Google)**, restricted exclusively to the authorized email: `sanielken2@gmail.com` (for development testing).

*(Note: Edge Function CSV exports have been deferred. We will continue utilizing the existing client-side CSV exports for now, as they meet the current performance needs.)*

---

## User Review Required

> [!IMPORTANT]
> **Supabase Console Configuration Needed:**
> To enable Google OAuth and enforce this new workflow, you will need to perform the following actions in your Supabase Dashboard:
> 1. Go to **Authentication → Providers → Google**.
> 2. Enable the provider, configure the **Client ID** and **Client Secret** (obtained from Google Cloud Console), and save.
> 3. Go to **Authentication → Providers → Email** and disable it.

> [!WARNING]
> **Enforcing Single Email Allowlist via Database Triggers:**
> Since Supabase Auth does not natively support restricting OAuth logins to a single email address, we will implement a PostgreSQL `BEFORE INSERT` trigger on the `auth.users` schema. This trigger will reject sign-ups from any Google account other than `sanielken2@gmail.com`.

---

## Proposed Changes

### Database Layer (Supabase)

#### [NEW] `022_auth_google_oauth_pivot.sql` (file:///C:/Users/Cedrick/farm-alert/farm-alert-backend/supabase/migrations/022_auth_google_oauth_pivot.sql)
- **Email Allowlist Enforcement:** 
  - Add `BEFORE INSERT ON auth.users` trigger (`trg_restrict_to_authorized_email`) checking if `NEW.email = 'sanielken2@gmail.com'`. If it does not match, raise a Postgres exception which blocks authentication.
- **Automatic Profile Sync:**
  - Add `AFTER INSERT ON auth.users` trigger (`on_auth_user_created`) to automatically sync the newly authenticated Google user into the `public.users` table, pre-assigning them the Default Admin role.

---

### Frontend API & Services

#### [MODIFY] [auth.js](file:///c:/Users/Cedrick/farm-alert/farm-alert-frontend/src/services/auth.js)
- Deprecate/remove `login(email, password)` and `updatePassword(newPassword)`.
- Add `loginWithGoogle()` utilizing `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: ... } })`.

---

### Frontend Components & UI

#### [MODIFY] [Login.jsx](file:///c:/Users/Cedrick/farm-alert/farm-alert-frontend/src/pages/auth/Login.jsx)
- Redesign the page layout to feature a single high-fidelity, polished **"Sign in with Google"** button.
- Clean up old state variables (`email`, `password`, `showPassword`).
- Display clear guidance copy stating that access is restricted to `sanielken2@gmail.com`.
- Add robust loading indicators and display OAuth error messages returned from redirects (e.g. if the user tried to log in with an unauthorized Google account).

---

## Verification Plan

### Automated & Integration Tests
- Verify that the Postgres triggers block non-allowlisted inserts in `auth.users` and successfully sync allowlisted ones to `public.users`.

### Manual Verification
1. **Login Overhaul:**
   - Attempt logging in via Google using an unauthorized email address and verify that it displays a clear error (e.g. "Access restricted to authorized personnel only").
   - Log in using `sanielken2@gmail.com` and ensure it creates the public profile (if new) and redirects to `/dashboard`.
