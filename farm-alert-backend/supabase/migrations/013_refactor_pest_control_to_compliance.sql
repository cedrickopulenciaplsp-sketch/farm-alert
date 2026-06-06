-- Migration 013: Refactor pest_control_logs to pest_compliance_logs
-- Converts from detailed pest reporting to compliance monitoring

-- 1. Drop the pest-specific columns
ALTER TABLE pest_control_logs DROP COLUMN IF EXISTS pest_type;
ALTER TABLE pest_control_logs DROP COLUMN IF EXISTS treatment_applied;

-- 2. Add compliance_status column
ALTER TABLE pest_control_logs
ADD COLUMN compliance_status VARCHAR(20) NOT NULL DEFAULT 'Compliant'
CHECK (compliance_status IN ('Compliant', 'Semi-Compliant', 'Non-Compliant'));

-- 3. Rename date_of_intervention to evaluation_date
ALTER TABLE pest_control_logs RENAME COLUMN date_of_intervention TO evaluation_date;

-- 4. Rename table
ALTER TABLE pest_control_logs RENAME TO pest_compliance_logs;
