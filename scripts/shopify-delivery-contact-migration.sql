-- Keeps checkout delivery contact details separately so the App can reliably
-- copy a delivery label without trying to parse the human-readable details text.
-- Existing orders remain valid: their new fields are NULL until edited or
-- re-imported; new Shopify Delivery orders populate all four fields.
BEGIN;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS recipient_name TEXT,
  ADD COLUMN IF NOT EXISTS recipient_phone TEXT,
  ADD COLUMN IF NOT EXISTS delivery_address_line_1 TEXT,
  ADD COLUMN IF NOT EXISTS delivery_address_line_2 TEXT;

ALTER TABLE public.shopify_orders
  ADD COLUMN IF NOT EXISTS recipient_name TEXT,
  ADD COLUMN IF NOT EXISTS recipient_phone TEXT,
  ADD COLUMN IF NOT EXISTS delivery_address_line_1 TEXT,
  ADD COLUMN IF NOT EXISTS delivery_address_line_2 TEXT;

COMMIT;
