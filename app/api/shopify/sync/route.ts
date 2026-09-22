import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: "Shopify sync is temporarily disabled while the separate Shopify order list is being prepared." },
    { status: 503 },
  );
}
