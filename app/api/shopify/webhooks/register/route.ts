import { NextRequest, NextResponse } from "next/server";
import { registerShopifyWebhooks } from "@/lib/shopify/admin-api";
import { getErrorName, getRequestId, logOperationalEvent } from "@/lib/operational-log";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = getRequestId(request);
  const configuredSecret = process.env.SHOPIFY_SYNC_SECRET;
  const suppliedSecret = request.headers.get("x-shopify-sync-secret");
  if (!configuredSecret || suppliedSecret !== configuredSecret) {
    logOperationalEvent("warn", "shopify.webhook_registration.rejected", {
      route: "/api/shopify/webhooks/register",
      requestId,
      reason: "unauthorized",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const appUrl = process.env.SHOPIFY_APP_URL || process.env.NEXTAUTH_URL;
  if (!appUrl) {
    logOperationalEvent("error", "shopify.webhook_registration.failed", {
      route: "/api/shopify/webhooks/register",
      requestId,
      reason: "app_url_not_configured",
    });
    return NextResponse.json({ error: "SHOPIFY_APP_URL is not configured" }, { status: 500 });
  }
  try {
    const webhookUrl = new URL("/api/shopify/webhooks/orders", appUrl).toString();
    const result = await registerShopifyWebhooks(webhookUrl);
    logOperationalEvent("info", "shopify.webhook_registration.completed", {
      route: "/api/shopify/webhooks/register",
      requestId,
      createdCount: result.created.length,
      skippedCount: result.skipped.length,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook registration failed";
    logOperationalEvent("error", "shopify.webhook_registration.failed", {
      route: "/api/shopify/webhooks/register",
      requestId,
      errorName: getErrorName(error),
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
