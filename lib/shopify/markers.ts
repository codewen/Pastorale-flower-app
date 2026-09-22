import type { Order } from "@/types/order";

/** Marker stored in the existing details column; no schema change required. */
export const SHOPIFY_ORDER_MARKER = "[Shopify sync order]";

export function isShopifyOrder(order: Pick<Order, "details">): boolean {
  return order.details?.includes(SHOPIFY_ORDER_MARKER) ?? false;
}
