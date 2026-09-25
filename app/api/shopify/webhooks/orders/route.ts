import { NextRequest, NextResponse } from "next/server";
import { verifyShopifyWebhook, getShopifyOrder } from "@/lib/shopify/admin-api";
import { stageShopifyOrder } from "@/lib/shopify/staging";

export const runtime = "nodejs";

const ROUTE = "/api/shopify/webhooks/orders";

function logWebhook(
  level: "info" | "error",
  event: string,
  requestId: string | null,
  fields: Record<string, unknown> = {},
) {
  const entry = JSON.stringify({
    level,
    event: `shopify.webhook.${event}`,
    route: ROUTE,
    requestId,
    timestamp: new Date().toISOString(),
    ...fields,
  });
  // Emit one JSON line so Vercel can index each webhook event.
  // eslint-disable-next-line no-console
  (level === "error" ? console.error : console.info)(entry);
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = request.headers.get("x-vercel-id");
  const topic = request.headers.get("x-shopify-topic")?.toLowerCase();
  if (topic && topic !== "orders/create") {
    logWebhook("info", "ignored", requestId, { topic, reason: "unsupported_topic", durationMs: Date.now() - startedAt });
    return NextResponse.json({ ok: true, ignored: true, reason: "Only orders/create is accepted" });
  }
  const rawBody = await request.text();
  if (!verifyShopifyWebhook(rawBody, request.headers.get("x-shopify-hmac-sha256"))) {
    logWebhook("error", "rejected", requestId, { topic, reason: "invalid_signature", status: 401, durationMs: Date.now() - startedAt });
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }
  let orderName: string | undefined;
  logWebhook("info", "received", requestId, { topic: topic || "orders/create" });
  try {
    const payload = JSON.parse(rawBody) as { admin_graphql_api_id?: string; id?: number | string };
    const id = payload.admin_graphql_api_id || (payload.id ? `gid://shopify/Order/${payload.id}` : null);
    if (!id) {
      logWebhook("error", "rejected", requestId, { topic, reason: "missing_order_id", status: 400, durationMs: Date.now() - startedAt });
      return NextResponse.json({ error: "Missing order id" }, { status: 400 });
    }
    logWebhook("info", "fetch_started", requestId);
    const order = await getShopifyOrder(id);
    orderName = order.name;
    logWebhook("info", "order_fetched", requestId, {
      orderName,
      deliveryFee: Number(order.currentShippingPriceSet.shopMoney.amount),
      shippingLineCount: order.shippingLines.nodes.length,
    });
    const staged = await stageShopifyOrder(order);
    logWebhook("info", "staged", requestId, {
      orderName,
      stagedId: staged.id,
      pickupDelivery: staged.pickup_delivery,
      deliveryDateTimeConfirmed: Boolean(staged.delivery_date_time),
      reviewStatus: staged.review_status,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({ ok: true, stagedId: staged.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    logWebhook("error", "failed", requestId, {
      ...(orderName ? { orderName } : {}),
      error: message.slice(0, 300),
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
