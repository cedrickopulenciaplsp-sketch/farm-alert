-- Migration 026: Resolve Outbreak Cascade
-- When an outbreak is marked as 'Resolved', automatically:
--   1. Mark all linked farms' active disease reports (for that disease) as 'Resolved'
--   2. Reset farm status back to 'Active' if the farm has NO other active reports

CREATE OR REPLACE FUNCTION resolve_outbreak_cascade()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_farm_id            UUID;
  v_remaining_active   INTEGER;
BEGIN
  -- Only fire when status transitions TO 'Resolved' from a non-Resolved state
  IF NEW.status != 'Resolved' OR OLD.status = 'Resolved' THEN
    RETURN NEW;
  END IF;

  -- Iterate over every farm linked to this outbreak
  FOR v_farm_id IN
    SELECT farm_id
    FROM outbreak_farm_links
    WHERE outbreak_id = NEW.outbreak_id
  LOOP
    -- Step 1: Resolve all Active/Under Monitoring reports for this disease on this farm
    UPDATE disease_reports
    SET    status = 'Resolved'
    WHERE  farm_id   = v_farm_id
      AND  disease_id = NEW.disease_id
      AND  status IN ('Active', 'Under Monitoring');

    -- Step 2: Count any remaining active reports across ALL diseases on this farm
    SELECT COUNT(*) INTO v_remaining_active
    FROM   disease_reports
    WHERE  farm_id = v_farm_id
      AND  status IN ('Active', 'Under Monitoring');

    -- Step 3: If the farm is fully clear, restore it from Quarantine → Active
    IF v_remaining_active = 0 THEN
      UPDATE farms
      SET    status = 'Active'
      WHERE  farm_id = v_farm_id
        AND  status  = 'Quarantine';
    END IF;

  END LOOP;

  RETURN NEW;
END;
$$;

-- Attach trigger (safe to re-run)
DROP TRIGGER IF EXISTS trg_resolve_outbreak_cascade ON outbreak_alerts;

CREATE TRIGGER trg_resolve_outbreak_cascade
  AFTER UPDATE ON outbreak_alerts
  FOR EACH ROW
  EXECUTE FUNCTION resolve_outbreak_cascade();
