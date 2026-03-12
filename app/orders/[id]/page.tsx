"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { getOrderById, getOrders, getPhotoUrl, deleteOrder } from "@/lib/supabase/orders";
import { Order } from "@/types/order";
import type { OrderStatus } from "@/types/order";
import { Button } from "@/components/ui/button";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Edit, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import Image from "next/image";

const STATUS_STORAGE_KEY = "orders-status-filter";

function getStoredStatusFilter(): OrderStatus[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STATUS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    if (parsed.length === 0) return [];
    if (
      parsed.length === 1 &&
      (parsed[0] === "Ordered" || parsed[0] === "Ready" || parsed[0] === "Done")
    ) {
      return parsed as OrderStatus[];
    }
    return null;
  } catch {
    return null;
  }
}

const SWIPE_THRESHOLD_PX = 60;

export default function ViewOrderPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [prevId, setPrevId] = useState<string | null>(null);
  const [nextId, setNextId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const handleDelete = useCallback(async () => {
    if (!order) return;
    if (!confirm("Delete this order? This cannot be undone.")) return;
    try {
      setIsDeleting(true);
      await deleteOrder(orderId);
      router.push("/orders");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete order.";
      alert(message);
    } finally {
      setIsDeleting(false);
    }
  }, [order, orderId, router]);

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

  // Load list order (same filter as list page) to resolve prev/next for swipe
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all = await getOrders();
        const statusFilter = getStoredStatusFilter();
        const filtered =
          statusFilter !== null && statusFilter.length > 0
            ? all.filter((o) => statusFilter.includes(o.status))
            : all;
        // getOrders returns delivery_date_time desc
        const idx = filtered.findIndex((o) => o.id === orderId);
        if (cancelled) return;
        setPrevId(idx > 0 ? filtered[idx - 1].id : null);
        setNextId(idx >= 0 && idx < filtered.length - 1 ? filtered[idx + 1].id : null);
      } catch {
        if (!cancelled) {
          setPrevId(null);
          setNextId(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const goToPrev = useCallback(() => {
    if (prevId) router.replace(`/orders/${prevId}`);
  }, [prevId, router]);

  const goToNext = useCallback(() => {
    if (nextId) router.replace(`/orders/${nextId}`);
  }, [nextId, router]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const start = touchStartX.current;
      touchStartX.current = null;
      if (start == null) return;
      const end = e.changedTouches[0].clientX;
      const deltaX = end - start;
      if (deltaX > SWIPE_THRESHOLD_PX) goToPrev();
      else if (deltaX < -SWIPE_THRESHOLD_PX) goToNext();
    },
    [goToPrev, goToNext]
  );

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
    <div
      className="min-h-screen bg-white pb-20 touch-pan-y"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <header className="border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 bg-white z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/orders")}
            className="p-1 hover:bg-gray-100 rounded"
            aria-label="Back to orders"
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
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="p-2 hover:bg-red-50 text-red-600 rounded disabled:opacity-50"
          aria-label="Delete order"
          title="Delete order"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </header>

      {/* Swipe prev/next buttons (desktop or when swipe is unclear) */}
      {prevId && (
        <button
          type="button"
          onClick={goToPrev}
          className="fixed left-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/90 shadow border border-gray-200 text-gray-700 hover:bg-gray-50"
          aria-label="Previous order"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}
      {nextId && (
        <button
          type="button"
          onClick={goToNext}
          className="fixed right-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/90 shadow border border-gray-200 text-gray-700 hover:bg-gray-50"
          aria-label="Next order"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      <div className="p-3 space-y-2">
        {/* 1. Customer ID */}
        <div className="border-b border-gray-100 pb-2">
          <label className="text-xs font-medium text-gray-500 block mb-0.5">
            Customer ID
          </label>
          <p className="text-sm text-gray-900">{order.customer_id}</p>
        </div>

        {/* 2. Details */}
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

        {/* 3. Price */}
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

        {/* 4. Photo */}
        {order.photos && order.photos.length > 0 && (
          <div className="border-b border-gray-100 pb-2">
            <label className="text-xs font-medium text-gray-500 block mb-1">
              Photo
            </label>
            <div className="space-y-2">
              {order.photos.map((photoUrl, index) => {
                const displayUrl = getPhotoUrl(photoUrl) || photoUrl;
                return (
                <button
                  key={index}
                  type="button"
                  onClick={() => setFullscreenImage((current) => (current === displayUrl ? null : displayUrl))}
                  className="relative w-full h-80 rounded-lg overflow-hidden border border-gray-300 bg-gray-100 block text-left"
                >
                  <Image
                    src={displayUrl}
                    alt={`Photo ${index + 1}`}
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </button>
              ); })}
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

        {/* 5. Pickup/Delivery */}
        <div className="border-b border-gray-100 pb-2">
          <label className="text-xs font-medium text-gray-500 block mb-0.5">
            Pickup/Delivery
          </label>
          <p className="text-sm text-gray-900">{order.pickup_delivery}</p>
        </div>

        {/* 6. Date/Time */}
        <div className="border-b border-gray-100 pb-2">
          <label className="text-xs font-medium text-gray-500 block mb-0.5">
            Date/Time
          </label>
          <p className="text-sm text-gray-900">
            {formatDate(order.delivery_date_time)}
          </p>
        </div>

        {/* 7. Payment Status */}
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

        {/* 8. Status */}
        <div className="border-b border-gray-100 pb-2">
          <label className="text-xs font-medium text-gray-500 block mb-0.5">
            Status
          </label>
          <p className="text-sm text-gray-900">{order.status}</p>
        </div>
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
