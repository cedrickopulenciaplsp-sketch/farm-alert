-- Migration 012: Add notes column to pest_control_logs
-- This adds the notes field required by Phase 8 Pest Control Module

ALTER TABLE pest_control_logs
ADD COLUMN notes TEXT;
