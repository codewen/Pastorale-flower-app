import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { listShopifyOrders } from "@/lib/shopify/admin-api";
import { stageShopifyOrder } from "@/lib/shopify/staging";
import { getErrorName, getRequestId, logOperationalEvent } from "@/lib/operational-log";

export const runtime = "nodejs";

function parseOrderNumber(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const digits = value.trim().replace(/^#/, "");
  return /^\d{1,12}$/.test(digits) ? `#${digits}` : null;
}

/**
 * Secure, staff-only test utility. It reads one existing Shopify order and
 * stages it for review; it never creates or edits the Shopify order itself.
 */
export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = getRequestId(request);
  const session = await getServerSession(authOptions);
  if (!session) {
    logOperationalEvent("warn", "shopify.review_sync.rejected", {
      route: "/api/shopify/review-sync", requestId, reason: "unauthorized",
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let orderName: string | null = null;
  try {
    const body: unknown = await request.json();
    orderName = parseOrderNumber(
      body && typeof body === "object" ? (body as Record<string, unknown>).orderNumber : undefined,
    );
    if (!orderName) {
      return NextResponse.json({ error: "Enter a valid Shopify order number, for example #7645." }, { status: 400 });
    }

    const matches = await listShopifyOrders(`name:${orderName}`);
    const order = matches.find((candidate) => candidate.name === orderName);
    if (!order) {
      return NextResponse.json({ error: `Shopify order ${orderName} was not found.` }, { status: 404 });
    }

    const staged = await stageShopifyOrder(order);
    logOperationalEvent("info", "shopify.review_sync.completed", {
      route: "/api/shopify/review-sync", requestId, orderName,
      reviewStatus: staged.review_status, durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({ orderName, stagedId: staged.id, reviewStatus: staged.review_status });
  } catch (error) {
    logOperationalEvent("error", "shopify.review_sync.failed", {
      route: "/api/shopify/review-sync", requestId,
      ...(orderName ? { orderName } : {}),
      errorName: getErrorName(error), durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({ error: "Could not read and stage this Shopify order." }, { status: 502 });
  }
}
