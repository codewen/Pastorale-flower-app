"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { OrderForm } from "@/components/OrderForm";
import { getOrderById, updateOrder } from "@/lib/supabase/orders";
import { Order, OrderFormData } from "@/types/order";

export default function EditOrderPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadOrder = useCallback(async () => {
    try {
      setIsLoading(true);
      const orderData = await getOrderById(orderId);
      setOrder(orderData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load order. Please try again.";
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const handleSubmit = async (formData: OrderFormData) => {
    try {
      setIsSaving(true);
      const currentOrder = order;
      if (!currentOrder) throw new Error("Order is no longer available. Please reload and try again.");
      // Convert datetime-local to ISO string
      const dateTime = new Date(formData.delivery_date_time);
      formData.delivery_date_time = dateTime.toISOString();

      await updateOrder(orderId, formData);

      if (
        currentOrder.pickup_delivery === "Pickup" &&
        currentOrder.status !== "Done" &&
        formData.status === "Done"
      ) {
        try {
          const response = await fetch("/api/shopify/ready-for-pickup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderName: currentOrder.order_id }),
          });

          if (!response.ok) {
            const result = (await response.json().catch(() => ({}))) as { error?: string };
            alert(result.error || "订单已在 App 标记为 Done，但 Shopify 未能标记为 Ready for pickup。请检查 Shopify 权限和服务端日志。");
          }
        } catch {
          alert("订单已在 App 标记为 Done，但未能连接 Shopify。请检查服务端日志。");
        }
      }

      router.push(`/orders/${orderId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update order. Please try again.";
      alert(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push("/orders");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-500">Loading order...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-500">Order not found</div>
      </div>
    );
  }

  const initialData: Partial<OrderFormData> = {
    order_id: order.order_id,
    customer_id: order.customer_id,
    details: order.details || "",
    status: order.status,
    delivery_date_time: order.delivery_date_time,
    pickup_delivery: order.pickup_delivery,
    payment_status: order.payment_status,
    price: order.price,
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200 p-4">
        <h1 className="text-xl font-semibold">Edit Order</h1>
      </header>
      <OrderForm
        initialData={initialData}
        existingPhotos={order.photos || []}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isSaving}
      />
    </div>
  );
}
