-- Migration 018: Add Poultry-Specific Fields to Farms Table
-- Phase 5 Revision — Based on CVO-provided Poultry Facility Form format.
--
-- All columns are NULLABLE so that existing swine farm records are
-- unaffected and the swine registration form requires no changes.
--
-- New Fields:
--   production_type        → Type of poultry production (e.g., Broiler, Layer)
--   production_type_other  → Free-text value when 'Others' is selected
--   facility_status        → Ownership status of the farm facility
--   male_population        → Count of male birds/animals
--   female_population      → Count of female birds/animals

ALTER TABLE farms
  ADD COLUMN IF NOT EXISTS production_type       VARCHAR(50),
  ADD COLUMN IF NOT EXISTS production_type_other VARCHAR(150),
  ADD COLUMN IF NOT EXISTS facility_status       VARCHAR(30),
  ADD COLUMN IF NOT EXISTS male_population       INTEGER CHECK (male_population IS NULL OR male_population >= 0),
  ADD COLUMN IF NOT EXISTS female_population     INTEGER CHECK (female_population IS NULL OR female_population >= 0);

-- Add a constraint so production_type_other is only meaningful when
-- production_type is 'Others' (optional guard, does not block saves).
-- The frontend validation handles this rule on the UI side.

COMMENT ON COLUMN farms.production_type       IS 'Poultry only: Broiler, Layer, Quail, Duck, Broiler Breeder, Layer Breeder, Others';
COMMENT ON COLUMN farms.production_type_other IS 'Poultry only: Free-text specification when production_type = Others';
COMMENT ON COLUMN farms.facility_status       IS 'Poultry only: Owned | Rented/Leased';
COMMENT ON COLUMN farms.male_population       IS 'Poultry only: Count of male birds';
COMMENT ON COLUMN farms.female_population     IS 'Poultry only: Count of female birds';
