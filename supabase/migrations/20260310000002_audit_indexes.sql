CREATE INDEX IF NOT EXISTS idx_audit_logs_building_created ON audit_logs(building_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON audit_logs(building_id, table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(building_id, user_id);
