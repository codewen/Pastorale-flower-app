import { supabase } from "./client";
import type { ShopifyReviewStatus, ShopifyStagedOrder } from "@/types/shopify";

export async function getShopifyStagedOrders(): Promise<ShopifyStagedOrder[]> {
  const { data, error } = await supabase
    .from("shopify_orders")
    .select("id, shopify_order_id, order_id, customer_id, details, status, delivery_date_time, pickup_delivery, payment_status, price, review_status, created_at, updated_at")
    .in("review_status", ["New", "In review"])
    .order("delivery_date_time", { ascending: true });
  if (error) throw new Error(`Failed to load Shopify review orders: ${error.message}`);
  return (data || []) as ShopifyStagedOrder[];
}

export async function updateShopifyStagedOrder(
  id: string,
  values: Partial<Pick<ShopifyStagedOrder, "customer_id" | "details" | "delivery_date_time" | "pickup_delivery" | "payment_status" | "price" | "status">>,
  review_status: ShopifyReviewStatus = "In review",
) {
  const { data, error } = await supabase
    .from("shopify_orders")
    .update({ ...values, review_status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(`Failed to update Shopify review order: ${error.message}`);
  return data as ShopifyStagedOrder;
}

export async function approveShopifyStagedOrder(order: ShopifyStagedOrder) {
  const { data: inserted, error: orderError } = await supabase
    .from("orders")
    .insert({
      order_id: order.order_id,
      customer_id: order.customer_id,
      details: order.details,
      status: order.status,
      delivery_date_time: order.delivery_date_time,
      pickup_delivery: order.pickup_delivery,
      payment_status: order.payment_status,
      price: order.price,
      photos: [],
    })
    .select()
    .single();
  if (orderError) throw new Error(`Failed to add Shopify order to daily orders: ${orderError.message}`);

  const { error: stageError } = await supabase
    .from("shopify_orders")
    .update({ review_status: "Imported", updated_at: new Date().toISOString() })
    .eq("id", order.id);
  if (stageError) throw new Error(`Order added, but review status could not be updated: ${stageError.message}`);
  return inserted;
}

export async function rejectShopifyStagedOrder(id: string) {
  return updateShopifyStagedOrder(id, {}, "Rejected");
}
