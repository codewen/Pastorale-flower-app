import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { markShopifyOrderReadyForPickup } from "@/lib/shopify/admin-api";
import { getShopifyPickupTarget } from "@/lib/shopify/staging";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let appOrderId: unknown;
  try {
    ({ appOrderId } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof appOrderId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(appOrderId)) {
    return NextResponse.json({ error: "A valid app order ID is required" }, { status: 400 });
  }

  try {
    const target = await getShopifyPickupTarget(appOrderId);
    if (!target) {
      // Confirm the source and current status from the database, not client input.
      // eslint-disable-next-line no-console
      console.info("[shopify.ready_for_pickup] skipped", { appOrderId, reason: "not_shopify_pickup_order" });
      return NextResponse.json({ marked: 0, skipped: true, reason: "not_shopify_pickup_order" });
    }

    const result = await markShopifyOrderReadyForPickup(target.shopifyOrderId);
    // eslint-disable-next-line no-console
    console.info("[shopify.ready_for_pickup]", { appOrderId, orderName: target.orderName, ...result });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Shopify error";
    // eslint-disable-next-line no-console
    console.error("[shopify.ready_for_pickup] failed", { appOrderId, message });
    return NextResponse.json(
      { error: "The app order was saved, but Shopify could not be marked ready for pickup." },
      { status: 502 },
    );
  }
}
