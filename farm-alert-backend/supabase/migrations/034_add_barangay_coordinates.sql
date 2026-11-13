-- =============================================================================
-- Migration 034: Add Georeferencing & Contact Columns to Barangays (Task 0.2)
-- =============================================================================
-- Purpose:
--   1. Add official Barangay Hall / Centroid GPS coordinates (latitude, longitude)
--      to public.barangays so selecting a barangay in FarmForm automatically
--      pre-fills and pans the map to that barangay.
--   2. Add contact_person and contact_number columns for Barangay Masterlist CRUD.
--   3. Allow Admins to insert/update barangays via RLS.
-- =============================================================================

ALTER TABLE public.barangays
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(9, 6),
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(9, 6),
  ADD COLUMN IF NOT EXISTS contact_person VARCHAR(100),
  ADD COLUMN IF NOT EXISTS contact_number VARCHAR(20);

-- Ensure authenticated users (Admin/Staff) can manage barangays in the Masterlist
DROP POLICY IF EXISTS "barangays_insert_authenticated" ON public.barangays;
CREATE POLICY "barangays_insert_authenticated" ON public.barangays
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "barangays_update_authenticated" ON public.barangays;
CREATE POLICY "barangays_update_authenticated" ON public.barangays
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
