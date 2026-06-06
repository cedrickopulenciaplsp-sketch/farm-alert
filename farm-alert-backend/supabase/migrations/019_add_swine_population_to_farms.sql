-- Migration 019: Add swine_population to farms table
-- Supports the split head-count model for mixed (Both) farms.
--
-- For "Both" farms:
--   head_count     = swine_population + male_population + female_population
--   (auto-calculated by the frontend on save)
--
-- For "Swine" farms:
--   head_count     = direct user input (unchanged)
--   swine_population = null (not used)
--
-- For "Poultry" farms:
--   head_count     = male_population + female_population (auto-calculated)
--   swine_population = null (not used)

ALTER TABLE farms
  ADD COLUMN IF NOT EXISTS swine_population INTEGER
    CHECK (swine_population IS NULL OR swine_population >= 0);

COMMENT ON COLUMN farms.swine_population IS 'Both-type only: Count of swine on a mixed farm. head_count = swine_population + male_population + female_population.';
