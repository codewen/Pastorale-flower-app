import { NextRequest, NextResponse } from "next/server";
import { getRequestId, logOperationalEvent } from "@/lib/operational-log";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  logOperationalEvent("warn", "shopify.sync_endpoint_disabled", {
    route: "/api/shopify/sync",
    requestId: getRequestId(request),
  });
  return NextResponse.json(
    { error: "Shopify sync is temporarily disabled while the separate Shopify order list is being prepared." },
    { status: 503 },
  );
}
