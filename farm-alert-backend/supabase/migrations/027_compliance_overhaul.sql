-- Migration 027: Compliance Overhaul — CVO SOP Integration
-- Removes "Semi-Compliant" status and introduces two-pronged binary evaluation:
--   1. Physical Inspection (pass/fail)
--   2. Documentation (pass/fail)
-- A farm is "Compliant" ONLY if both checks pass. Otherwise "Non-Compliant".

-- 1. Add the two new boolean evaluation columns
ALTER TABLE pest_compliance_logs
  ADD COLUMN IF NOT EXISTS passed_physical_inspection BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE pest_compliance_logs
  ADD COLUMN IF NOT EXISTS passed_documentation BOOLEAN NOT NULL DEFAULT false;

-- 2. Migrate existing data: map old statuses to the new booleans
--    Compliant      → both true
--    Semi-Compliant → physical true, docs false (best-effort mapping)
--    Non-Compliant  → both false
UPDATE pest_compliance_logs
SET passed_physical_inspection = true, passed_documentation = true
WHERE compliance_status = 'Compliant';

UPDATE pest_compliance_logs
SET passed_physical_inspection = true, passed_documentation = false
WHERE compliance_status = 'Semi-Compliant';

UPDATE pest_compliance_logs
SET passed_physical_inspection = false, passed_documentation = false
WHERE compliance_status = 'Non-Compliant';

-- 3. Drop the old CHECK constraint and update compliance_status to be computed
ALTER TABLE pest_compliance_logs
  DROP CONSTRAINT IF EXISTS pest_control_logs_compliance_status_check;

-- Set compliance_status based on the two booleans
UPDATE pest_compliance_logs
SET compliance_status = CASE
  WHEN passed_physical_inspection = true AND passed_documentation = true THEN 'Compliant'
  ELSE 'Non-Compliant'
END;

-- 4. Add new CHECK constraint (only Compliant / Non-Compliant)
ALTER TABLE pest_compliance_logs
  ADD CONSTRAINT pest_compliance_logs_status_check
  CHECK (compliance_status IN ('Compliant', 'Non-Compliant'));

-- 5. Create trigger function to auto-compute compliance_status on insert/update
CREATE OR REPLACE FUNCTION compute_compliance_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.passed_physical_inspection = true AND NEW.passed_documentation = true THEN
    NEW.compliance_status := 'Compliant';
  ELSE
    NEW.compliance_status := 'Non-Compliant';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_compute_compliance_status ON pest_compliance_logs;

CREATE TRIGGER trg_compute_compliance_status
  BEFORE INSERT OR UPDATE ON pest_compliance_logs
  FOR EACH ROW
  EXECUTE FUNCTION compute_compliance_status();

-- 6. Create trigger to auto-insert a "Day 1" compliance record for new farms
--    New farms are assumed to have passed their initial physical inspection.
CREATE OR REPLACE FUNCTION auto_compliance_on_new_farm()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_encoder_id UUID;
BEGIN
  -- Use the first available user as the encoder for the auto-record
  SELECT user_id INTO v_encoder_id FROM users LIMIT 1;

  IF v_encoder_id IS NOT NULL THEN
    INSERT INTO pest_compliance_logs (
      farm_id,
      compliance_status,
      passed_physical_inspection,
      passed_documentation,
      evaluation_date,
      notes,
      encoded_by
    ) VALUES (
      NEW.farm_id,
      'Non-Compliant',  -- Will be computed by trigger (physical=true, docs=false → Non-Compliant)
      true,             -- Physical inspection passed on registration
      false,            -- Documentation not yet submitted
      CURRENT_DATE,
      'Initial registration — physical inspection passed upon farm registration.',
      v_encoder_id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_compliance_on_new_farm ON farms;

CREATE TRIGGER trg_auto_compliance_on_new_farm
  AFTER INSERT ON farms
  FOR EACH ROW
  EXECUTE FUNCTION auto_compliance_on_new_farm();
