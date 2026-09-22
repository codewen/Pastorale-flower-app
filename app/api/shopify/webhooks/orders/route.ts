import { NextRequest, NextResponse } from "next/server";
import { verifyShopifyWebhook, getShopifyOrder } from "@/lib/shopify/admin-api";
import { stageShopifyOrder } from "@/lib/shopify/staging";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const topic = request.headers.get("x-shopify-topic")?.toLowerCase();
  if (topic && topic !== "orders/create") {
    return NextResponse.json({ ok: true, ignored: true, reason: "Only orders/create is accepted" });
  }
  const rawBody = await request.text();
  if (!verifyShopifyWebhook(rawBody, request.headers.get("x-shopify-hmac-sha256"))) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }
  try {
    const payload = JSON.parse(rawBody) as { admin_graphql_api_id?: string; id?: number | string };
    const id = payload.admin_graphql_api_id || (payload.id ? `gid://shopify/Order/${payload.id}` : null);
    if (!id) return NextResponse.json({ error: "Missing order id" }, { status: 400 });
    const staged = await stageShopifyOrder(await getShopifyOrder(id));
    return NextResponse.json({ ok: true, stagedId: staged.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
