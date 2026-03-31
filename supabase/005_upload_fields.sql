ALTER TABLE layouts ADD COLUMN IF NOT EXISTS vehicle_tags text[] DEFAULT '{}';
ALTER TABLE layouts ADD COLUMN IF NOT EXISTS can_speed text;
ALTER TABLE layouts ADD COLUMN IF NOT EXISTS compatibility_notes text;
ALTER TABLE layouts ADD COLUMN IF NOT EXISTS dbc_signal_count int DEFAULT 0;
ALTER TABLE layouts ADD COLUMN IF NOT EXISTS dbc_can_ids text;
