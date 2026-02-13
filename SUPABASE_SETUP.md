# Supabase Setup Instructions

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Create a new project
4. Note your project URL and anon key from the project settings

## 2. Create Database Table

Run the following SQL in the Supabase SQL Editor:

```sql
-- Create orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT UNIQUE NOT NULL,
  customer_id TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'Ordered' CHECK (status IN ('Ordered', 'Ready', 'Done')),
  delivery_date_time TIMESTAMPTZ NOT NULL,
  pickup_delivery TEXT NOT NULL CHECK (pickup_delivery IN ('Pickup', 'Delivery')),
  payment_status TEXT NOT NULL DEFAULT 'Pending' CHECK (payment_status IN ('Paid', 'Unpaid', 'Pending')),
  price NUMERIC,
  photos TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_delivery_date_time ON orders(delivery_date_time);
CREATE INDEX idx_orders_order_id ON orders(order_id);

-- Enable Row Level Security (optional, adjust policies as needed)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations (adjust based on your needs)
CREATE POLICY "Allow all operations" ON orders
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

## 3. Create Storage Bucket

1. Go to Storage in your Supabase dashboard
2. Click "New bucket"
3. Name it: `order-photos`
4. Make it public (or configure RLS policies as needed)
5. Click "Create bucket"

## 4. Configure Environment Variables

Create a `.env.local` file in your project root:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Replace with your actual Supabase project URL and anon key.

## 5. Test Connection

After setting up, you can test the connection by:
1. Running `npm run dev`
2. Navigating to `/import` to import your order data
3. Navigating to `/orders` to see your orders
