-- Migration 022: Merge Active & Quarantine into a single status value
-- Updates the check constraint and migrates existing data.

-- 1. Drop the old constraint
ALTER TABLE farms
  DROP CONSTRAINT IF EXISTS farms_status_check;

-- 2. Migrate existing rows
UPDATE farms SET status = 'Active/Quarantine' WHERE status IN ('Active', 'Quarantine');

-- 3. Add new constraint with merged value
ALTER TABLE farms
  ADD CONSTRAINT farms_status_check
  CHECK (status IN ('Active/Quarantine', 'Inactive', 'Temporarily Closed'));
