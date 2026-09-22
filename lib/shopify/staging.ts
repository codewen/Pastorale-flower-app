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
  const { data, error } = await getSupabase()
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
      { onConflict: "shopify_order_id", ignoreDuplicates: false },
    )
    .select()
    .single();
  if (error) throw new Error(`Failed to stage ${order.name}: ${error.message}`);
  return data;
}
