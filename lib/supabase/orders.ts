import { supabase } from "./client";
import { Order, OrderFormData } from "@/types/order";

const STORAGE_BUCKET = "order-photos";

export async function getOrders(status?: string): Promise<Order[]> {
  let query = supabase.from("orders").select("*").order("delivery_date_time", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch orders: ${error.message}`);
  }

  return data as Order[];
}

export async function getOrderById(id: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(`Failed to fetch order: ${error.message}`);
  }

  return data as Order;
}

export async function createOrder(formData: OrderFormData): Promise<Order> {
  // Upload photos if provided
  let photoUrls: string[] = [];
  if (formData.photos && formData.photos.length > 0) {
    photoUrls = await Promise.all(
      formData.photos.map((photo) => uploadPhoto(photo))
    );
  }

  // Generate order_id if not provided
  const orderId = formData.order_id || generateOrderId();

  // Ensure price is a number or null (avoid sending NaN)
  const price =
    formData.price != null && Number.isFinite(formData.price)
      ? formData.price
      : null;

  const { data, error } = await supabase
    .from("orders")
    .insert({
      order_id: orderId,
      customer_id: formData.customer_id,
      details: formData.details || null,
      status: formData.status || "Ordered",
      delivery_date_time: formData.delivery_date_time,
      pickup_delivery: formData.pickup_delivery,
      payment_status: formData.payment_status || "Pending",
      price,
      photos: photoUrls,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create order: ${error.message}`);
  }

  return data as Order;
}

export async function updateOrder(
  id: string,
  formData: OrderFormData
): Promise<Order> {
  const updateData: {
    customer_id: string;
    details: string | null;
    status: string;
    delivery_date_time: string;
    pickup_delivery: string;
    payment_status: string;
    price: number | null;
    updated_at: string;
    photos?: string[];
    order_id?: string;
  } = {
    customer_id: formData.customer_id,
    details: formData.details || null,
    status: formData.status,
    delivery_date_time: formData.delivery_date_time,
    pickup_delivery: formData.pickup_delivery,
    payment_status: formData.payment_status,
    price: formData.price,
    updated_at: new Date().toISOString(),
  };

  // Upload new photos if provided
  if (formData.photos && formData.photos.length > 0) {
    const newPhotoUrls = await Promise.all(
      formData.photos.map((photo) => uploadPhoto(photo))
    );
    // Get existing order to merge with existing photos
    const existingOrder = await getOrderById(id);
    const existingPhotos = existingOrder?.photos || [];
    updateData.photos = [...existingPhotos, ...newPhotoUrls];
  }

  if (formData.order_id) {
    updateData.order_id = formData.order_id;
  }

  const { data, error } = await supabase
    .from("orders")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update order: ${error.message}`);
  }

  return data as Order;
}

export async function deleteOrder(id: string): Promise<void> {
  const { error } = await supabase.from("orders").delete().eq("id", id);

  if (error) {
    throw new Error(`Failed to delete order: ${error.message}`);
  }
}

async function uploadPhoto(file: File): Promise<string> {
  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file);

  if (uploadError) {
    throw new Error(`Failed to upload photo: ${uploadError.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);

  return publicUrl;
}

export function getPhotoUrl(path: string | null): string | null {
  if (!path) return null;
  // If it's already a full URL, return it
  if (path.startsWith("http")) return path;
  // Otherwise, construct Supabase URL
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function generateOrderId(): string {
  return Math.random().toString(36).substring(2, 10);
}
