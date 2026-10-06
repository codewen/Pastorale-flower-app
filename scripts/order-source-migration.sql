-- Run in the Supabase SQL Editor before deploying the order-source feature.
-- Existing orders default to manual; new imports write their source explicitly.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_source_check'
      AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_source_check
      CHECK (source IN ('manual', 'shopify_import'));
  END IF;
END
$$;
