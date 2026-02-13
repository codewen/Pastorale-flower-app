"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if Supabase is configured, otherwise redirect to setup
    if (!isSupabaseConfigured()) {
      router.push("/setup");
    } else {
      router.push("/orders");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-gray-500">Loading...</div>
    </div>
  );
}
