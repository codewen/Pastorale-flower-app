-- Blackout dates table for Pastorale Flower storefront datepicker
CREATE TABLE IF NOT EXISTS blackout_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  disable_pickup BOOLEAN NOT NULL DEFAULT true,
  disable_delivery BOOLEAN NOT NULL DEFAULT true,
  pickup_start_hour INTEGER CHECK (pickup_start_hour IS NULL OR (pickup_start_hour >= 0 AND pickup_start_hour <= 23)),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blackout_dates_date ON blackout_dates(date);

ALTER TABLE blackout_dates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read blackout dates" ON blackout_dates;
CREATE POLICY "Public read blackout dates" ON blackout_dates FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow all writes" ON blackout_dates;
CREATE POLICY "Allow all writes" ON blackout_dates FOR ALL USING (true) WITH CHECK (true);

-- Seed from KINGDOM/assets/theme.js (as of migration)
INSERT INTO blackout_dates (date, disable_pickup, disable_delivery, pickup_start_hour, notes)
VALUES
  ('2026-04-06', true, true, NULL, 'Both blocked'),
  ('2026-04-25', true, true, NULL, 'Both blocked'),
  ('2026-04-26', true, true, NULL, 'Both blocked'),
  ('2026-04-27', true, true, NULL, 'Both blocked'),
  ('2026-05-09', true, true, NULL, 'Both blocked'),
  ('2026-05-10', true, true, NULL, 'Both blocked'),
  ('2026-05-18', false, false, 12, 'Partial pickup from 12:00'),
  ('2026-06-08', false, true, NULL, 'Delivery only'),
  ('2026-06-14', true, true, NULL, 'Both blocked'),
  ('2026-08-03', false, true, NULL, 'Delivery only'),
  ('2026-10-05', false, true, NULL, 'Delivery only'),
  ('2026-12-25', false, true, NULL, 'Delivery only'),
  ('2026-12-26', false, true, NULL, 'Delivery only'),
  ('2026-12-28', false, true, NULL, 'Delivery only')
ON CONFLICT (date) DO NOTHING;
