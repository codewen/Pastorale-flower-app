import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return NextResponse.json({ ok: true, ignored: true, reason: "Shopify sync is temporarily disabled" });
}
