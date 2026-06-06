-- ============================================================
-- Migration 014: Analytics Views
-- Phase 8 – Advanced Analytics Module
-- ============================================================

-- Drop existing views first to allow column type changes
DROP VIEW IF EXISTS v_analytics_by_severity;
DROP VIEW IF EXISTS v_analytics_by_barangay;
DROP VIEW IF EXISTS v_analytics_by_disease;
DROP VIEW IF EXISTS v_analytics_monthly;

-- 1. v_analytics_monthly
-- Monthly case counts (animals_affected + mortalities) grouped by year/month.
-- ============================================================
CREATE VIEW v_analytics_monthly AS
SELECT
  date_trunc('month', dr.date_reported)::DATE AS report_month,
  to_char(dr.date_reported, 'Mon YYYY')       AS month_label,
  COUNT(dr.report_id)                          AS total_reports,
  COALESCE(SUM(dr.animals_affected), 0)        AS total_animals_affected,
  COALESCE(SUM(dr.mortalities), 0)             AS total_mortalities
FROM disease_reports dr
GROUP BY
  date_trunc('month', dr.date_reported),
  to_char(dr.date_reported, 'Mon YYYY')
ORDER BY
  date_trunc('month', dr.date_reported);


-- 2. v_analytics_by_disease
-- Case distribution grouped by disease.
-- ============================================================
CREATE VIEW v_analytics_by_disease AS
SELECT
  d.disease_id,
  d.disease_name,
  lt.type_name                                AS livestock_type,
  COUNT(dr.report_id)                         AS total_reports,
  COALESCE(SUM(dr.animals_affected), 0)       AS total_animals_affected,
  COALESCE(SUM(dr.mortalities), 0)            AS total_mortalities
FROM disease_reports dr
JOIN diseases d  ON dr.disease_id = d.disease_id
JOIN livestock_types lt ON d.livestock_type_id = lt.livestock_type_id
GROUP BY
  d.disease_id,
  d.disease_name,
  lt.type_name
ORDER BY
  total_reports DESC;


-- 3. v_analytics_by_barangay
-- Disease density grouped by barangay (rural barangays).
-- ============================================================
CREATE VIEW v_analytics_by_barangay AS
SELECT
  b.barangay_id,
  b.barangay_name,
  b.classification,                            -- 0=Rural, 1=Urban
  COUNT(dr.report_id)                          AS total_reports,
  COALESCE(SUM(dr.animals_affected), 0)        AS total_animals_affected,
  COALESCE(SUM(dr.mortalities), 0)             AS total_mortalities,
  COUNT(DISTINCT dr.farm_id)                   AS farms_affected
FROM barangays b
LEFT JOIN farms f   ON f.barangay_id = b.barangay_id
LEFT JOIN disease_reports dr ON dr.farm_id = f.farm_id
GROUP BY
  b.barangay_id,
  b.barangay_name,
  b.classification
ORDER BY
  total_reports DESC;


-- 4. v_analytics_by_severity
-- Severity counts based on the severity field in disease_reports.
-- ============================================================
CREATE VIEW v_analytics_by_severity AS
SELECT
  dr.severity,
  COUNT(dr.report_id)                         AS total_reports,
  COALESCE(SUM(dr.animals_affected), 0)       AS total_animals_affected,
  COALESCE(SUM(dr.mortalities), 0)            AS total_mortalities
FROM disease_reports dr
GROUP BY
  dr.severity
ORDER BY
  CASE dr.severity
    WHEN 'Critical' THEN 1
    WHEN 'Severe'   THEN 2
    WHEN 'Moderate' THEN 3
    WHEN 'Mild'     THEN 4
    ELSE 5
  END;
