-- Run once in the Supabase SQL Editor before deploying this feature.
-- Existing orders are initialized as not bundled and not made.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS is_bundled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_made BOOLEAN NOT NULL DEFAULT FALSE;
