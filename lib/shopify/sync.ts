import { createClient } from "@supabase/supabase-js";
import type { ShopifyOrder } from "./admin-api";
import { listShopifyOrders, getShopifyOrder } from "./admin-api";
import { mapShopifyOrder } from "./order-mapper";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase credentials are not configured");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function syncShopifyOrder(order: ShopifyOrder) {
  const { data, error } = await getSupabase()
    .from("orders")
    .upsert(mapShopifyOrder(order), { onConflict: "order_id" })
    .select()
    .single();
  if (error) throw new Error(`Failed to sync ${order.name}: ${error.message}`);
  return data;
}

export async function syncShopifyOrderById(id: string) {
  return syncShopifyOrder(await getShopifyOrder(id));
}

export async function syncShopifyOrders(query?: string) {
  const orders = await listShopifyOrders(query);
  const results = [];
  for (const order of orders) results.push(await syncShopifyOrder(order));
  return { count: results.length };
}

