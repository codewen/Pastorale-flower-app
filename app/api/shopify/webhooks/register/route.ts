import { NextRequest, NextResponse } from "next/server";
import { registerShopifyWebhooks } from "@/lib/shopify/admin-api";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const configuredSecret = process.env.SHOPIFY_SYNC_SECRET;
  const suppliedSecret = request.headers.get("x-shopify-sync-secret");
  if (!configuredSecret || suppliedSecret !== configuredSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const appUrl = process.env.SHOPIFY_APP_URL || process.env.NEXTAUTH_URL;
  if (!appUrl) return NextResponse.json({ error: "SHOPIFY_APP_URL is not configured" }, { status: 500 });
  try {
    const webhookUrl = new URL("/api/shopify/webhooks/orders", appUrl).toString();
    return NextResponse.json(await registerShopifyWebhooks(webhookUrl));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook registration failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
