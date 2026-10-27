-- Run once in the Supabase SQL Editor after order-production-status-migration.sql.
-- Existing orders are initialized as not missing flowers and not prepared.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS is_missing_flowers BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_prepared BOOLEAN NOT NULL DEFAULT FALSE;
