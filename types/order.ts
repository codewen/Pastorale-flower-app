export type OrderStatus = "Ordered" | "Ready" | "Done";
export type PickupDelivery = "Pickup" | "Delivery";
export type PaymentStatus = "Paid" | "Unpaid" | "Pending";

export interface Order {
  id: string;
  order_id: string;
  customer_id: string;
  details: string | null;
  status: OrderStatus;
  delivery_date_time: string;
  pickup_delivery: PickupDelivery;
  payment_status: PaymentStatus;
  price: number | null;
  photos: string[];
  created_at: string;
  updated_at: string;
}

export interface OrderFormData {
  order_id?: string;
  customer_id: string;
  details: string;
  status: OrderStatus;
  delivery_date_time: string;
  pickup_delivery: PickupDelivery;
  payment_status: PaymentStatus;
  price: number | null;
  photos?: File[];
}
