import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { syncShopifyOrders } from "@/lib/shopify/sync";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const configuredSecret = process.env.SHOPIFY_SYNC_SECRET;
  const suppliedSecret = request.headers.get("x-shopify-sync-secret");
  if (!session && (!configuredSecret || suppliedSecret !== configuredSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const query = typeof body?.query === "string" ? body.query : undefined;
    return NextResponse.json(await syncShopifyOrders(query));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Shopify sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

