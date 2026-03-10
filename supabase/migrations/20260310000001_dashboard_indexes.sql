-- Indexes to optimize dashboard aggregate queries
CREATE INDEX IF NOT EXISTS idx_charges_building_month_status ON charges(building_id, period_year, period_month, status);
CREATE INDEX IF NOT EXISTS idx_maintenance_building_created ON maintenance_requests(building_id, created_at);
CREATE INDEX IF NOT EXISTS idx_visitors_building_created ON visitors(building_id, created_at);
CREATE INDEX IF NOT EXISTS idx_payments_building_date ON payments(building_id, payment_date);
