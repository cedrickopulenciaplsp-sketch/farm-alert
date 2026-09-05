# Phase 9: Single Shared Account Pivot & Secure Authentication Redesign

## Sub-Phase 9A: Database Auth Triggers
- `[ ]` Write `022_auth_google_oauth_pivot.sql` migration
  - `[ ]` Enforce email allowlist validation for `sanielken2@gmail.com` via `BEFORE INSERT ON auth.users` trigger
  - `[ ]` Enable automatic profile syncing to `public.users` via `AFTER INSERT ON auth.users` trigger
- `[ ]` Run migration in Supabase SQL Editor
- `[ ]` **CHECKPOINT 9A** — Verify database table triggers are set up correctly

## Sub-Phase 9B: Frontend Google OAuth Integration
- `[ ]` Update `src/services/auth.js` to implement `loginWithGoogle` and remove legacy email methods
- `[ ]` Refactor `src/pages/auth/Login.jsx` to show a single "Sign in with Google" button with restricted access notice
- `[ ]` Implement redirect error handling to catch and report unauthorized email login attempts
- `[ ]` **CHECKPOINT 9B** — Verify visual rendering of Google OAuth button on the Login page and restricted auth

## Sub-Phase 9C: Supabase Dashboard Configuration (Manual Step)
- `[ ]` Disable standard Email/Password auth in the Supabase dashboard
- `[ ]` Enable Google OAuth provider in Supabase Auth using Client ID and Client Secret

## Sub-Phase 9D: Physical Security Guard (Google 2FA Setup - Manual Step)
- `[ ]` Log into `sanielken2@gmail.com` Google account settings
- `[ ]` Navigate to Security > 2-Step Verification
- `[ ]` Enable 2-Step Verification requiring mobile phone approval for all sign-ins
- `[ ]` **CHECKPOINT 9D** — Verify that logging in to Google prompts the phone approval to prevent unauthorized access
