"use client";

import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { PhotoUpload } from "./PhotoUpload";
import { OrderFormData, PickupDelivery, PaymentStatus, OrderStatus } from "@/types/order";
import { formatDate } from "@/lib/utils";

interface OrderFormProps {
  initialData?: Partial<OrderFormData>;
  existingPhotos?: string[]; // Existing photo URLs when editing
  onSubmit: (data: OrderFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function OrderForm({
  initialData,
  existingPhotos = [],
  onSubmit,
  onCancel,
  isLoading = false,
}: OrderFormProps) {
  const [formData, setFormData] = useState<OrderFormData>({
    customer_id: initialData?.customer_id || "",
    details: initialData?.details || "",
    status: initialData?.status || "Ordered",
    delivery_date_time: initialData?.delivery_date_time || "",
    pickup_delivery: initialData?.pickup_delivery || "Pickup",
    payment_status: initialData?.payment_status || "Pending",
    price: initialData?.price || null,
    photos: [],
  });

  const [remainingExistingPhotos, setRemainingExistingPhotos] = useState<string[]>(existingPhotos);

  useEffect(() => {
    setRemainingExistingPhotos(existingPhotos);
  }, [existingPhotos]);

  useEffect(() => {
    if (initialData?.delivery_date_time) {
      // Convert to local datetime string for input
      const date = new Date(initialData.delivery_date_time);
      const localDateTime = new Date(
        date.getTime() - date.getTimezoneOffset() * 60000
      )
        .toISOString()
        .slice(0, 16);
      setFormData((prev) => ({ ...prev, delivery_date_time: localDateTime }));
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      ...formData,
      existingPhotoUrls: existingPhotos.length > 0 ? remainingExistingPhotos : undefined,
    });
  };

  const handlePhotosChange = (files: File[]) => {
    setFormData((prev) => ({ ...prev, photos: files }));
  };

  const handlePriceChange = (value: string) => {
    const numValue = value.replace(/[^0-9.]/g, "");
    setFormData((prev) => ({
      ...prev,
      price: numValue ? parseFloat(numValue) : null,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6">
      {/* Customer ID */}
      <div>
        <Label htmlFor="customer-id" className="mb-2 block">
          Customer ID*
        </Label>
        <Input
          id="customer-id"
          value={formData.customer_id}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, customer_id: e.target.value }))
          }
          required
        />
      </div>

      {/* Pickup/Delivery */}
      <div>
        <Label className="mb-2 block">Pickup/Delivery*</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={formData.pickup_delivery === "Pickup" ? "default" : "outline"}
            onClick={() =>
              setFormData((prev) => ({ ...prev, pickup_delivery: "Pickup" }))
            }
          >
            Pickup
          </Button>
          <Button
            type="button"
            variant={formData.pickup_delivery === "Delivery" ? "default" : "outline"}
            onClick={() =>
              setFormData((prev) => ({ ...prev, pickup_delivery: "Delivery" }))
            }
          >
            Delivery
          </Button>
        </div>
      </div>

      {/* Date/Time */}
      <div>
        <Label htmlFor="date-time" className="mb-2 block">
          Date/Time*
        </Label>
        <Input
          id="date-time"
          type="datetime-local"
          value={formData.delivery_date_time}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              delivery_date_time: e.target.value,
            }))
          }
          required
        />
      </div>

      {/* Details */}
      <div>
        <Label htmlFor="details" className="mb-2 block">
          Details
        </Label>
        <Textarea
          id="details"
          value={formData.details}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, details: e.target.value }))
          }
          rows={4}
        />
      </div>

      {/* Photos */}
      <PhotoUpload
        photos={existingPhotos}
        onPhotosChange={handlePhotosChange}
        onExistingPhotosChange={setRemainingExistingPhotos}
      />

      {/* Payment Status */}
      <div>
        <Label className="mb-2 block">Payment Status*</Label>
        <div className="flex gap-2">
          {(["Paid", "Unpaid", "Pending"] as PaymentStatus[]).map((status) => (
            <Button
              key={status}
              type="button"
              variant={formData.payment_status === status ? "default" : "outline"}
              onClick={() =>
                setFormData((prev) => ({ ...prev, payment_status: status }))
              }
            >
              {status}
            </Button>
          ))}
        </div>
      </div>

      {/* Price */}
      <div>
        <Label htmlFor="price" className="mb-2 block">
          Price
        </Label>
        <div className="flex items-center gap-2">
          <span className="text-gray-500">$</span>
          <Input
            id="price"
            type="text"
            value={formData.price || ""}
            onChange={(e) => handlePriceChange(e.target.value)}
            placeholder="0.00"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setFormData((prev) => ({
                ...prev,
                price: (prev.price || 0) - 1,
              }))
            }
          >
            -
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setFormData((prev) => ({
                ...prev,
                price: (prev.price || 0) + 1,
              }))
            }
          >
            +
          </Button>
        </div>
      </div>

      {/* Status */}
      <div>
        <Label htmlFor="status" className="mb-2 block">
          Status
        </Label>
        <select
          id="status"
          value={formData.status}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              status: e.target.value as OrderStatus,
            }))
          }
          className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
        >
          <option value="Ordered">Ordered</option>
          <option value="Ready">Ready</option>
          <option value="Done">Done</option>
        </select>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-4 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
}
