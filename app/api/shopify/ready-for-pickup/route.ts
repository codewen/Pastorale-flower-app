import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { markShopifyOrderReadyForPickup } from "@/lib/shopify/admin-api";
import { getImportedShopifyOrderId } from "@/lib/shopify/staging";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let orderName: unknown;
  try {
    ({ orderName } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof orderName !== "string" || orderName.length > 40) {
    return NextResponse.json({ error: "A valid order name is required" }, { status: 400 });
  }

  try {
    const shopifyOrderId = await getImportedShopifyOrderId(orderName);
    if (!shopifyOrderId) {
      // The display name alone is not proof that the app order came from Shopify.
      // eslint-disable-next-line no-console
      console.info("[shopify.ready_for_pickup] skipped", { orderName, reason: "not_imported_from_shopify" });
      return NextResponse.json({ marked: 0, skipped: true, reason: "not_imported_from_shopify" });
    }

    const result = await markShopifyOrderReadyForPickup(shopifyOrderId);
    // eslint-disable-next-line no-console
    console.info("[shopify.ready_for_pickup]", { orderName, ...result });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Shopify error";
    // eslint-disable-next-line no-console
    console.error("[shopify.ready_for_pickup] failed", { orderName, message });
    return NextResponse.json(
      { error: "The app order was saved, but Shopify could not be marked ready for pickup." },
      { status: 502 },
    );
  }
}
