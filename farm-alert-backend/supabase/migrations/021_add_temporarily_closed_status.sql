-- Migration 021: Add 'Temporarily Closed' as a valid farm status
-- This extends the existing check constraint on farms.status

ALTER TABLE farms
  DROP CONSTRAINT IF EXISTS farms_status_check;

ALTER TABLE farms
  ADD CONSTRAINT farms_status_check
  CHECK (status IN ('Active', 'Inactive', 'Quarantine', 'Temporarily Closed'));
