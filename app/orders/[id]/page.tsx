"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { getOrderById } from "@/lib/supabase/orders";
import { Order } from "@/types/order";
import { Button } from "@/components/ui/button";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Edit } from "lucide-react";
import Image from "next/image";

export default function ViewOrderPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const loadOrder = useCallback(async () => {
    try {
      setIsLoading(true);
      const orderData = await getOrderById(orderId);
      setOrder(orderData);
    } catch (error) {
      // Error is handled by the UI (shows "Order not found")
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

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
    <div className="min-h-screen bg-white pb-20">
      <header className="border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 bg-white z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/orders")}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h1 className="text-xl font-semibold">Details</h1>
        </div>
      </header>

      <div className="p-3 space-y-2">
        {/* Customer ID */}
        <div className="border-b border-gray-100 pb-2">
          <label className="text-xs font-medium text-gray-500 block mb-0.5">
            Customer ID
          </label>
          <p className="text-sm text-gray-900">{order.customer_id}</p>
        </div>

        {/* Photos */}
        {order.photos && order.photos.length > 0 && (
          <div className="border-b border-gray-100 pb-2">
            <label className="text-xs font-medium text-gray-500 block mb-1">
              Photo
            </label>
            <div className="space-y-2">
              {order.photos.map((photoUrl, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setFullscreenImage((current) => (current === photoUrl ? null : photoUrl))}
                  className="relative w-full h-80 rounded-lg overflow-hidden border border-gray-300 bg-gray-100 block text-left"
                >
                  <Image
                    src={photoUrl}
                    alt={`Photo ${index + 1}`}
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </button>
              ))}
            </div>
            {fullscreenImage && (
              <button
                type="button"
                onClick={() => setFullscreenImage(null)}
                className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
                aria-label="Close fullscreen"
              >
                <img
                  src={fullscreenImage}
                  alt="Fullscreen"
                  className="max-w-full max-h-full object-contain"
                />
              </button>
            )}
          </div>
        )}

        {/* Pickup/Delivery */}
        <div className="border-b border-gray-100 pb-2">
          <label className="text-xs font-medium text-gray-500 block mb-0.5">
            Pickup/Delivery
          </label>
          <p className="text-sm text-gray-900">{order.pickup_delivery}</p>
        </div>

        {/* Date/Time */}
        <div className="border-b border-gray-100 pb-2">
          <label className="text-xs font-medium text-gray-500 block mb-0.5">
            Date/Time
          </label>
          <p className="text-sm text-gray-900">
            {formatDate(order.delivery_date_time)}
          </p>
        </div>

        {/* Payment Status */}
        <div className="border-b border-gray-100 pb-2">
          <label className="text-xs font-medium text-gray-500 block mb-0.5">
            Payment Status
          </label>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              order.payment_status === "Paid"
                ? "bg-green-100 text-green-800"
                : order.payment_status === "Pending"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {order.payment_status}
          </span>
        </div>

        {/* Status */}
        <div className="border-b border-gray-100 pb-2">
          <label className="text-xs font-medium text-gray-500 block mb-0.5">
            Status
          </label>
          <p className="text-sm text-gray-900">{order.status}</p>
        </div>

        {/* Price */}
        {order.price !== null && (
          <div className="border-b border-gray-100 pb-2">
            <label className="text-xs font-medium text-gray-500 block mb-0.5">
              Price
            </label>
            <p className="text-sm text-gray-900">
              {formatCurrency(order.price)}
            </p>
          </div>
        )}

        {/* Details */}
        {order.details && (
          <div className="border-b border-gray-100 pb-2">
            <label className="text-xs font-medium text-gray-500 block mb-0.5">
              Details
            </label>
            <p className="text-sm text-gray-900 whitespace-pre-wrap">
              {order.details}
            </p>
          </div>
        )}
      </div>

      {/* Floating Edit Button */}
      <button
        onClick={() => router.push(`/orders/${orderId}/edit`)}
        className="fixed bottom-20 right-4 bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 transition-colors z-20"
        aria-label="Edit Order"
      >
        <Edit className="h-6 w-6" />
      </button>
    </div>
  );
}
