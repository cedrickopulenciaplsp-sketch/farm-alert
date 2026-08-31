-- Migration 025: Remove unused system settings
-- 'system_name' and 'institution_name' are hardcoded in the frontend
-- and not consumed anywhere in the application logic.
-- Removing them to keep the System Settings page clean and avoid
-- confusing panelists/reviewers with non-functional settings.

DELETE FROM system_settings
WHERE setting_key IN ('system_name', 'institution_name');
