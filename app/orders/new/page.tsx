"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OrderForm } from "@/components/OrderForm";
import { createOrder } from "@/lib/supabase/orders";
import { OrderFormData } from "@/types/order";

export default function NewOrderPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (formData: OrderFormData) => {
    if (!formData.delivery_date_time?.trim()) {
      alert("Please enter Date/Time.");
      return;
    }
    const dateTime = new Date(formData.delivery_date_time);
    if (Number.isNaN(dateTime.getTime())) {
      alert("Please enter a valid Date/Time.");
      return;
    }

    const payload: OrderFormData = {
      ...formData,
      delivery_date_time: dateTime.toISOString(),
    };

    try {
      setIsLoading(true);
      await createOrder(payload);
      router.push("/orders");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create order. Please try again.";
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push("/orders");
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="border-b border-gray-200 p-4">
        <h1 className="text-xl font-semibold">New Order</h1>
      </header>
      <OrderForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isLoading}
      />
    </div>
  );
}
