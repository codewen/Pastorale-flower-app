"use client";

import { useRouter } from "next/navigation";
import { OrderForm } from "@/components/OrderForm";
import { createOrder } from "@/lib/supabase/orders";
import { OrderFormData } from "@/types/order";

export default function NewOrderPage() {
  const router = useRouter();

  const handleSubmit = async (formData: OrderFormData) => {
    try {
      // Convert datetime-local to ISO string
      const dateTime = new Date(formData.delivery_date_time);
      formData.delivery_date_time = dateTime.toISOString();

      await createOrder(formData);
      router.push("/orders");
    } catch (error) {
      console.error("Failed to create order:", error);
      alert("Failed to create order. Please try again.");
    }
  };

  const handleCancel = () => {
    router.push("/orders");
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200 p-4">
        <h1 className="text-xl font-semibold">New Order</h1>
      </header>
      <OrderForm onSubmit={handleSubmit} onCancel={handleCancel} />
    </div>
  );
}
