-- Migration 029: Drop Severity Math
-- The CVO does not have exact numbers for animals_affected/mortalities.
-- Therefore, we are stopping the auto-calculation of severity based on these numbers.

DROP TRIGGER IF EXISTS trg_disease_report_severity ON disease_reports;
DROP FUNCTION IF EXISTS trg_calculate_report_severity();
