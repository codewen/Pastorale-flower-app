import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return NextResponse.json({ error: "Shopify webhook registration is temporarily disabled." }, { status: 503 });
}
