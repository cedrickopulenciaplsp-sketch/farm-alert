-- Migration 011: Auto-set Acknowledged By
-- Automatically sets the acknowledged_by field to the current user 
-- when the status of an outbreak is changed to 'Acknowledged'.

CREATE OR REPLACE FUNCTION trg_set_acknowledged_by()
RETURNS TRIGGER LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  -- If status changes to Acknowledged, set the acknowledged_by using our helper function
  IF NEW.status = 'Acknowledged' AND OLD.status != 'Acknowledged' THEN
    NEW.acknowledged_by := current_user_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_outbreak_acknowledge
BEFORE UPDATE ON outbreak_alerts
FOR EACH ROW EXECUTE FUNCTION trg_set_acknowledged_by();
