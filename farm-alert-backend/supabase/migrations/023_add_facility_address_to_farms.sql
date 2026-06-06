-- Migration 023: Add facility_address to farms
-- Adds a specific street/facility address for farms

ALTER TABLE farms
  ADD COLUMN facility_address text;
