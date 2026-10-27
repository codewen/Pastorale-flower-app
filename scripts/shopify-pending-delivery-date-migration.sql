-- Run before deploying support for Shopify orders with an unconfirmed schedule.
-- Keep the daily orders table's NOT NULL constraint: only reviewed, scheduled
-- orders belong there. Existing timestamps are left unchanged.
BEGIN;
ALTER TABLE public.shopify_orders
  ALTER COLUMN delivery_date_time DROP NOT NULL,
  ALTER COLUMN delivery_date_time DROP DEFAULT;
COMMIT;
