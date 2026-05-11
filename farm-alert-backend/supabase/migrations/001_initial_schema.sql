-- Roles reference table
CREATE TABLE roles (
  role_id     SMALLINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  role_name   VARCHAR(50) NOT NULL UNIQUE  -- 'cvo_officer', 'admin'
);

-- Application user profiles (linked to Supabase Auth)
CREATE TABLE users (
  user_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id     UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   VARCHAR(150) NOT NULL,
  username    VARCHAR(100) NOT NULL UNIQUE,
  role_id     SMALLINT NOT NULL REFERENCES roles(role_id),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Barangay master list
CREATE TABLE barangays (
  barangay_id    SMALLINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  barangay_name  VARCHAR(100) NOT NULL UNIQUE,
  classification SMALLINT NOT NULL,  -- 0 = Rural, 1 = Urban
  is_active      BOOLEAN NOT NULL DEFAULT TRUE
);

-- Livestock classification reference
CREATE TABLE livestock_types (
  livestock_type_id  SMALLINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  type_name          VARCHAR(50) NOT NULL UNIQUE  -- 'Swine', 'Poultry', 'Both'
);

-- Farm registry
CREATE TABLE farms (
  farm_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_name         VARCHAR(150) NOT NULL,
  owner_name        VARCHAR(150) NOT NULL,
  barangay_id       SMALLINT NOT NULL REFERENCES barangays(barangay_id),
  livestock_type_id SMALLINT NOT NULL REFERENCES livestock_types(livestock_type_id),
  head_count        INTEGER NOT NULL CHECK (head_count >= 0),
  contact_number    VARCHAR(20),
  latitude          NUMERIC(10, 7),   -- For Leaflet.js map pinning
  longitude         NUMERIC(10, 7),   -- For Leaflet.js map pinning
  status            VARCHAR(20) NOT NULL DEFAULT 'Active'
                    CHECK (status IN ('Active', 'Inactive', 'Quarantine')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Disease reference cards
CREATE TABLE diseases (
  disease_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disease_name       VARCHAR(150) NOT NULL UNIQUE,
  livestock_type_id  SMALLINT NOT NULL REFERENCES livestock_types(livestock_type_id),
  description        TEXT,
  common_symptoms    TEXT,
  causes             TEXT,
  control_prevention TEXT
);

-- Core disease report records
CREATE TABLE disease_reports (
  report_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id            UUID NOT NULL REFERENCES farms(farm_id),
  disease_id         UUID NOT NULL REFERENCES diseases(disease_id),
  animals_affected   INTEGER NOT NULL CHECK (animals_affected >= 0),
  mortalities        INTEGER NOT NULL DEFAULT 0 CHECK (mortalities >= 0),
  severity           VARCHAR(20) NOT NULL
                     CHECK (severity IN ('Mild', 'Moderate', 'Severe', 'Critical')),
  symptoms_observed  TEXT,
  date_reported      DATE NOT NULL DEFAULT CURRENT_DATE,
  status             VARCHAR(30) NOT NULL DEFAULT 'Active'
                     CHECK (status IN ('Active', 'Under Monitoring', 'Resolved')),
  additional_notes   TEXT,
  encoded_by         UUID NOT NULL REFERENCES users(user_id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Follow-up notes threaded to a report
CREATE TABLE report_followups (
  followup_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id    UUID NOT NULL REFERENCES disease_reports(report_id) ON DELETE CASCADE,
  note         TEXT NOT NULL,
  added_by     UUID NOT NULL REFERENCES users(user_id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Outbreak alert records
CREATE TABLE outbreak_alerts (
  outbreak_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barangay_id          SMALLINT NOT NULL REFERENCES barangays(barangay_id),
  disease_id           UUID NOT NULL REFERENCES diseases(disease_id),
  farms_affected_count INTEGER NOT NULL,
  date_triggered       TIMESTAMPTZ NOT NULL DEFAULT now(),
  status               VARCHAR(20) NOT NULL DEFAULT 'Active'
                       CHECK (status IN ('Active', 'Acknowledged', 'Resolved')),
  acknowledged_by      UUID REFERENCES users(user_id)
);

-- Junction: farms involved in each outbreak
CREATE TABLE outbreak_farm_links (
  link_id      BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  outbreak_id  UUID NOT NULL REFERENCES outbreak_alerts(outbreak_id) ON DELETE CASCADE,
  farm_id      UUID NOT NULL REFERENCES farms(farm_id),
  UNIQUE (outbreak_id, farm_id)
);

-- Pest intervention records per farm
CREATE TABLE pest_control_logs (
  log_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id              UUID NOT NULL REFERENCES farms(farm_id),
  pest_type            VARCHAR(100) NOT NULL,
  treatment_applied    VARCHAR(200) NOT NULL,
  date_of_intervention DATE NOT NULL,
  encoded_by           UUID NOT NULL REFERENCES users(user_id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Key-value system settings (configurable by admin)
CREATE TABLE system_settings (
  setting_id    SMALLINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  setting_key   VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Immutable audit trail
CREATE TABLE audit_logs (
  log_id       BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id      UUID REFERENCES users(user_id),
  action       VARCHAR(150) NOT NULL,  -- e.g., 'Created Farm', 'Resolved Outbreak'
  target_table VARCHAR(100),
  target_id    TEXT,                   -- UUID or ID of affected record
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
