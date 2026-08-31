-- Migration 024: Update outbreak farm threshold to 1
-- The client requested that an outbreak alert be triggered even if there is only 1 report
UPDATE system_settings 
SET setting_value = '1' 
WHERE setting_key = 'outbreak_farm_threshold';
