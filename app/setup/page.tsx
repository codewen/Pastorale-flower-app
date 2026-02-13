"use client";

import { useEffect, useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function SetupPage() {
  const [isConfigured, setIsConfigured] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    setIsConfigured(isSupabaseConfigured());
    setChecking(false);
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-500">Checking configuration...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Supabase Setup Guide</h1>

        {!isConfigured ? (
          <div className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h2 className="font-semibold text-yellow-800">
                  Supabase Not Configured
                </h2>
                <p className="text-yellow-700 mt-1">
                  Please follow the steps below to set up your Supabase backend.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <Step
                number={1}
                title="Create Supabase Project"
                completed={false}
              >
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>Go to <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">supabase.com</a></li>
                  <li>Sign up or log in to your account</li>
                  <li>Click &quot;New Project&quot;</li>
                  <li>Fill in your project details (name, database password, region)</li>
                  <li>Wait for the project to be created (takes 1-2 minutes)</li>
                </ol>
              </Step>

              <Step
                number={2}
                title="Get Your API Credentials"
                completed={false}
              >
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>In your Supabase project dashboard, go to Settings (gear icon)</li>
                  <li>Click on &quot;API&quot; in the left sidebar</li>
                  <li>Copy the following values:
                    <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                      <li><strong>Project URL</strong> (under &quot;Project URL&quot;)</li>
                      <li><strong>anon/public key</strong> (under &quot;Project API keys&quot;)</li>
                    </ul>
                  </li>
                </ol>
              </Step>

              <Step
                number={3}
                title="Create Environment Variables File"
                completed={false}
              >
                <div className="space-y-3">
                  <p className="text-gray-700">
                    Create a file named <code className="bg-gray-100 px-2 py-1 rounded">.env.local</code> in your project root directory.
                  </p>
                  <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
                    <div>NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co</div>
                    <div>NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here</div>
                  </div>
                  <p className="text-gray-600 text-sm">
                    Replace the values with your actual Supabase URL and anon key from Step 2.
                  </p>
                </div>
              </Step>

              <Step
                number={4}
                title="Create Database Table"
                completed={false}
              >
                <div className="space-y-3">
                  <p className="text-gray-700">
                    In your Supabase dashboard, go to the SQL Editor and run this SQL:
                  </p>
                  <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                    <pre>{`CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT UNIQUE NOT NULL,
  customer_id TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'Ordered' 
    CHECK (status IN ('Ordered', 'Ready', 'Done')),
  delivery_date_time TIMESTAMPTZ NOT NULL,
  pickup_delivery TEXT NOT NULL 
    CHECK (pickup_delivery IN ('Pickup', 'Delivery')),
  payment_status TEXT NOT NULL DEFAULT 'Pending' 
    CHECK (payment_status IN ('Paid', 'Unpaid', 'Pending')),
  price NUMERIC,
  photos TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_delivery_date_time ON orders(delivery_date_time);
CREATE INDEX idx_orders_order_id ON orders(order_id);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations" ON orders
  FOR ALL
  USING (true)
  WITH CHECK (true);`}</pre>
                  </div>
                </div>
              </Step>

              <Step
                number={5}
                title="Create Storage Bucket"
                completed={false}
              >
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>In your Supabase dashboard, go to Storage</li>
                  <li>Click &quot;New bucket&quot;</li>
                  <li>Name it: <code className="bg-gray-100 px-2 py-1 rounded">order-photos</code></li>
                  <li>Make it <strong>public</strong> (toggle the &quot;Public bucket&quot; switch)</li>
                  <li>Click &quot;Create bucket&quot;</li>
                </ol>
              </Step>

              <Step
                number={6}
                title="Restart Development Server"
                completed={false}
              >
                <div className="space-y-3">
                  <p className="text-gray-700">
                    After creating the <code className="bg-gray-100 px-2 py-1 rounded">.env.local</code> file, you need to restart your development server:
                  </p>
                  <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
                    <div># Stop the current server (Ctrl+C)</div>
                    <div>npm run dev</div>
                  </div>
                </div>
              </Step>

              <div className="pt-4">
                <Button
                  onClick={() => window.location.reload()}
                  className="w-full"
                >
                  Check Configuration Again
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h2 className="font-semibold text-green-800">
                  Supabase Configured Successfully!
                </h2>
                <p className="text-green-700 mt-1">
                  Your backend is ready to use.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link href="/orders">
                <Button className="w-full" variant="default">
                  View Orders
                </Button>
              </Link>
              <Link href="/import">
                <Button className="w-full" variant="outline">
                  Import Orders
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Step({
  number,
  title,
  completed,
  children,
}: {
  number: number;
  title: string;
  completed: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
            completed
              ? "bg-green-100 text-green-800"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {completed ? <CheckCircle className="h-5 w-5" /> : number}
        </div>
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <div className="ml-11">{children}</div>
    </div>
  );
}
