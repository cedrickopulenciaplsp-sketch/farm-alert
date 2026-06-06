-- Migration 020: Add male/female swine population columns
-- Swine head count is now split by sex, matching the poultry format.
--
-- Swine farms:   head_count = male_swine + female_swine
-- Poultry farms: head_count = male_birds + female_birds  (unchanged)
-- Both farms:    head_count = male_swine + female_swine + male_birds + female_birds

ALTER TABLE farms
  ADD COLUMN IF NOT EXISTS male_swine_population   INTEGER
    CHECK (male_swine_population   IS NULL OR male_swine_population   >= 0),
  ADD COLUMN IF NOT EXISTS female_swine_population INTEGER
    CHECK (female_swine_population IS NULL OR female_swine_population >= 0);

COMMENT ON COLUMN farms.male_swine_population   IS 'Swine/Both: Count of male swine. head_count is auto-calculated from sex-disaggregated populations.';
COMMENT ON COLUMN farms.female_swine_population IS 'Swine/Both: Count of female swine. head_count is auto-calculated from sex-disaggregated populations.';
