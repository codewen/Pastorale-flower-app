# Pastorale Flower Order Tracker

A web application for managing flower shop orders built with Next.js, TypeScript, and Supabase.

## Features

- **Order Management**: Create, view, edit, and track orders
- **Status Filtering**: Filter orders by status (Ordered, Ready, Done)
- **Photo Upload**: Upload and manage photos for each order
- **Search**: Search orders by customer ID, details, or order ID
- **Payment Tracking**: Track payment status (Paid, Unpaid, Pending)
- **Pickup/Delivery**: Manage both pickup and delivery orders

## Setup

### Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works fine)

### Quick Start

1. **Install dependencies:**
```bash
npm install
```

2. **Set up Supabase backend:**
   - The easiest way is to visit `/setup` in your browser after starting the dev server
   - Or follow the detailed instructions in `SUPABASE_SETUP.md`

3. **Create environment variables:**
   - Copy `.env.local.example` to `.env.local`
   - Fill in your Supabase credentials (get them from your Supabase project dashboard)
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. Set up Supabase database:
   - Create a new Supabase project
   - Run the following SQL to create the orders table:

```sql
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

CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_delivery_date_time ON orders(delivery_date_time);
```

4. Set up Supabase Storage:
   - Create a storage bucket named `order-photos`
   - Set it to public or configure appropriate RLS policies

5. Run the development server:
```bash
npm run dev
```

6. **Import existing order data:**
   - Navigate to `/import` in your browser
   - Click "Import Orders" to import the provided order data

### Setup Helper

If you haven't set up Supabase yet, you can:
1. Start the dev server: `npm run dev`
2. Navigate to `http://localhost:3000/setup`
3. Follow the step-by-step instructions to set up your Supabase backend

## Project Structure

```
/
├── app/                    # Next.js app router pages
│   ├── orders/            # Order management pages
│   └── import/            # Data import page
├── components/            # React components
│   ├── ui/               # Base UI components
│   ├── OrderForm.tsx     # Order form component
│   ├── OrderTable.tsx    # Order table component
│   └── PhotoUpload.tsx   # Photo upload component
├── lib/                  # Utility functions
│   ├── supabase/        # Supabase client and utilities
│   └── utils.ts         # General utilities
├── types/               # TypeScript type definitions
└── scripts/            # Data import scripts
```

## Usage

### Creating an Order

1. Click the "+" button in the footer or navigate to `/orders/new`
2. Fill in the order details
3. Upload a photo if needed
4. Click "Save"

### Editing an Order

1. Click on any order in the order list
2. Make your changes
3. Click "Save"

### Filtering Orders

- Use the status tabs at the top (Ordered, Ready, Done) to filter orders
- Use the search bar to search by customer ID, details, or order ID

## Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key

## Deployment

This project is configured for deployment to Vercel with CI/CD via GitHub Actions.

### Quick Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repository
3. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy!

Vercel will automatically deploy on every push to main/master and create preview deployments for pull requests.

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

### CI/CD

The project includes GitHub Actions workflows:
- **CI**: Runs linting and builds on every push/PR
- **Deploy**: Automatically deploys to Vercel on pushes to main/master

## Technologies

- **Next.js 14**: React framework with App Router
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **Supabase**: Backend (PostgreSQL database and file storage)
- **Lucide React**: Icons
- **Vercel**: Hosting and deployment
- **GitHub Actions**: CI/CD pipeline
