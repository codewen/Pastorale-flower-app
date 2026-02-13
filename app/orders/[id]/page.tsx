"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getOrderById } from "@/lib/supabase/orders";
import { Order } from "@/types/order";
import { Button } from "@/components/ui/button";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Edit } from "lucide-react";

export default function ViewOrderPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    try {
      setIsLoading(true);
      const orderData = await getOrderById(orderId);
      setOrder(orderData);
    } catch (error) {
      console.error("Failed to load order:", error);
    } finally {
      setIsLoading(false);
    }
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

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200 p-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Order Details</h1>
        <Button
          onClick={() => router.push(`/orders/${orderId}/edit`)}
          variant="default"
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </header>

      <div className="p-6 space-y-6">
        {/* Photos */}
        {order.photos && order.photos.length > 0 && (
          <div>
            <h2 className="text-sm font-medium mb-2">Photos</h2>
            <div className="grid grid-cols-2 gap-4">
              {order.photos.map((photoUrl, index) => (
                <div
                  key={index}
                  className="relative w-full h-48 rounded-lg overflow-hidden border border-gray-300"
                >
                  <img
                    src={photoUrl}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Order Information */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-500">Order ID</label>
            <p className="mt-1">{order.order_id}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Customer ID</label>
            <p className="mt-1">{order.customer_id}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Date/Time</label>
            <p className="mt-1">{formatDate(order.delivery_date_time)}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Pickup/Delivery</label>
            <p className="mt-1">{order.pickup_delivery}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Status</label>
            <p className="mt-1">{order.status}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Payment Status</label>
            <p className="mt-1">
              <span
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  order.payment_status === "Paid"
                    ? "bg-green-100 text-green-800"
                    : order.payment_status === "Pending"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {order.payment_status}
              </span>
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Price</label>
            <p className="mt-1">{formatCurrency(order.price)}</p>
          </div>
        </div>

        {/* Details */}
        <div>
          <label className="text-sm font-medium text-gray-500">Details</label>
          <p className="mt-1 whitespace-pre-wrap">{order.details || "-"}</p>
        </div>


        {/* Actions */}
        <div className="flex justify-end gap-4 pt-4">
          <Button variant="outline" onClick={() => router.push("/orders")}>
            Back to Orders
          </Button>
          <Button onClick={() => router.push(`/orders/${orderId}/edit`)}>
            Edit Order
          </Button>
        </div>
      </div>
    </div>
  );
}
