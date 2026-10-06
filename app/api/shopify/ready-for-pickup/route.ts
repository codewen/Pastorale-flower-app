import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { markShopifyOrderReadyForPickup } from "@/lib/shopify/admin-api";

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

  // Shopify order names imported by the app use the #1234 format. Ignore
  // manually-created app orders rather than searching Shopify for them.
  if (!/^#\d+$/.test(orderName)) {
    return NextResponse.json({ marked: 0, skipped: true, reason: "not_shopify_order" });
  }

  try {
    const result = await markShopifyOrderReadyForPickup(orderName);
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
