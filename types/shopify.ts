import type { PaymentStatus, PickupDelivery, OrderStatus } from "./order";

export type ShopifyReviewStatus = "New" | "In review" | "Approved" | "Rejected" | "Imported";

export interface ShopifyStagedOrder {
  id: string;
  shopify_order_id: string;
  order_id: string;
  customer_id: string;
  details: string | null;
  status: OrderStatus;
  delivery_date_time: string;
  pickup_delivery: PickupDelivery;
  payment_status: PaymentStatus;
  price: number | null;
  review_status: ShopifyReviewStatus;
  raw_order: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}
