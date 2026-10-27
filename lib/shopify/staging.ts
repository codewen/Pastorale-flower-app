import { createClient } from "@supabase/supabase-js";
import type { ShopifyOrder } from "./admin-api";
import { mapShopifyOrder } from "./order-mapper";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service credentials are not configured");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function stageShopifyOrder(order: ShopifyOrder) {
  const mapped = mapShopifyOrder(order);
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("shopify_orders")
    .upsert(
      {
        shopify_order_id: order.id,
        order_id: mapped.order_id,
        customer_id: mapped.customer_id,
        details: mapped.details,
        status: mapped.status,
        delivery_date_time: mapped.delivery_date_time,
        pickup_delivery: mapped.pickup_delivery,
        payment_status: mapped.payment_status,
        price: mapped.price,
        raw_order: order,
        updated_at: new Date().toISOString(),
      },
      // Shopify can retry orders/create. Preserve any draft edits or approval.
      { onConflict: "shopify_order_id", ignoreDuplicates: true },
    )
    .select()
    .maybeSingle();
  if (error) throw new Error(`Failed to stage ${order.name}: ${error.message}`);
  if (data) return data;

  const { data: existing, error: lookupError } = await supabase
    .from("shopify_orders")
    .select("*")
    .eq("shopify_order_id", order.id)
    .single();
  if (lookupError || !existing) {
    throw new Error(`Failed to load staged ${order.name}: ${lookupError?.message || "Order not found"}`);
  }
  return existing;
}

export async function getShopifyPickupTarget(appOrderId: string): Promise<{ orderName: string; shopifyOrderId: string } | null> {
  const client = getSupabase();
  const { data: appOrder, error: appOrderError } = await client
    .from("orders")
    .select("order_id, source, status, pickup_delivery")
    .eq("id", appOrderId)
    .maybeSingle();
  if (appOrderError) throw new Error(`Failed to verify app order source: ${appOrderError.message}`);
  if (
    !appOrder ||
    appOrder.source !== "shopify_import" ||
    appOrder.status !== "Done" ||
    appOrder.pickup_delivery !== "Pickup"
  ) return null;

  const { data, error } = await client
    .from("shopify_orders")
    .select("shopify_order_id")
    .eq("order_id", appOrder.order_id)
    .eq("review_status", "Imported")
    .maybeSingle();
  if (error) throw new Error(`Failed to verify staged Shopify order: ${error.message}`);
  if (!data?.shopify_order_id) return null;
  return { orderName: appOrder.order_id, shopifyOrderId: data.shopify_order_id };
}
