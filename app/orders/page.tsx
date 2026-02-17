"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { OrderTable } from "@/components/OrderTable";
import { Input } from "@/components/ui/input";
import { getOrders } from "@/lib/supabase/orders";
import { Order, OrderStatus, PickupDelivery } from "@/types/order";
import { Plus, Search, RefreshCw, Filter, X } from "lucide-react";

type PickupDeliveryFilter = PickupDelivery | "All";
type DeliveryDateKey = string; // YYYY-MM-DD in local time

const ORDER_STATUSES: OrderStatus[] = ["Ordered", "Ready", "Done"];

function getLocalDateKey(date: string | Date): DeliveryDateKey {
  const d = typeof date === "string" ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<OrderStatus[]>([]);
  const [pickupDeliveryFilter, setPickupDeliveryFilter] =
    useState<PickupDeliveryFilter>("All");
  const [dateFilter, setDateFilter] = useState<DeliveryDateKey[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    let filtered = orders;
    if (statusFilter.length > 0) {
      filtered = filtered.filter((order) => statusFilter.includes(order.status));
    }
    if (pickupDeliveryFilter !== "All") {
      filtered = filtered.filter(
        (order) => order.pickup_delivery === pickupDeliveryFilter
      );
    }
    if (dateFilter.length > 0) {
      const allowed = new Set(dateFilter);
      filtered = filtered.filter((order) =>
        allowed.has(getLocalDateKey(order.delivery_date_time))
      );
    }
    setFilteredOrders(filtered);
  }, [orders, statusFilter, pickupDeliveryFilter, dateFilter]);

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      const allOrders = await getOrders();
      setOrders(allOrders);
      setFilteredOrders(allOrders);
    } catch (error) {
      setMessage("Failed to load orders. Please refresh the page.");
    } finally {
      setIsLoading(false);
    }
  };

  const selectSingleStatus = (status: OrderStatus) => {
    // Single-select: if already selected, clear; otherwise, select only this one
    setStatusFilter((prev) =>
      prev.includes(status) && prev.length === 1 ? [] : [status]
    );
  };

  const clearStatusFilter = () => setStatusFilter([]);

  // Get today's and tomorrow's date keys
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const todayKey = getLocalDateKey(today);
  const tomorrowKey = getLocalDateKey(tomorrow);

  const selectSingleDate = (dateKey: DeliveryDateKey) => {
    // Single-select: if already selected, clear; otherwise, select only this one
    setDateFilter((prev) =>
      prev.includes(dateKey) && prev.length === 1 ? [] : [dateKey]
    );
  };

  const clearDateFilter = () => setDateFilter([]);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-xl font-semibold">Order</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className="p-2 hover:bg-gray-100 rounded md:hidden"
              title="Toggle Filters"
            >
              {filtersExpanded ? (
                <X className="h-5 w-5" />
              ) : (
                <Filter className="h-5 w-5" />
              )}
            </button>
            <button
              onClick={loadOrders}
              className="p-2 hover:bg-gray-100 rounded"
              title="Refresh"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Search */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Filters: status (multi-select) + pickup/delivery */}
      <div
        className={`border-b border-gray-200 space-y-3 transition-all duration-300 ease-in-out overflow-hidden ${
          filtersExpanded
            ? "max-h-96 opacity-100 p-4"
            : "max-h-0 opacity-0 p-0 border-b-0 md:max-h-96 md:opacity-100 md:p-4 md:border-b"
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-500 mr-1">Status</span>
          <button
            onClick={clearStatusFilter}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              statusFilter.length === 0
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All
          </button>
          {ORDER_STATUSES.map((status) => {
            const isActive = statusFilter.includes(status) && statusFilter.length === 1;
            return (
              <button
                key={status}
                onClick={() => selectSingleStatus(status)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {status}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-500 mr-1">
            Pickup/Delivery
          </span>
          {(["All", "Pickup", "Delivery"] as const).map((value) => (
            <button
              key={value}
              onClick={() => setPickupDeliveryFilter(value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                pickupDeliveryFilter === value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-500 mr-1">Date</span>
          <button
            onClick={clearDateFilter}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              dateFilter.length === 0
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All
          </button>
          {[
            { key: todayKey, label: "Today" },
            { key: tomorrowKey, label: "Tomorrow" },
          ].map(({ key, label }) => {
            const isActive = dateFilter.includes(key) && dateFilter.length === 1;
            return (
              <button
                key={key}
                onClick={() => selectSingleDate(key)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders Table */}
      <main className="p-2 md:p-4">
        {message && (
          <div className="mb-4 p-4 rounded bg-red-100 text-red-800">
            {message}
          </div>
        )}
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading orders...</div>
        ) : (
          <OrderTable orders={filteredOrders} searchQuery={searchQuery} />
        )}
      </main>

      {/* Footer Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="flex items-center justify-around p-4">
          <button
            onClick={() => router.push("/orders/new")}
            className="flex flex-col items-center gap-1 text-blue-600"
          >
            <div className="bg-blue-600 text-white rounded-full p-2">
              <Plus className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium">New Order</span>
          </button>
          <div className="flex gap-8">
            {(["Order", "Ready", "Done"] as const).map((tab) => {
              const status: OrderStatus =
                tab === "Order" ? "Ordered" : (tab as OrderStatus);
              const isActive = statusFilter.includes(status) && statusFilter.length === 1;
              return (
                <button
                  key={tab}
                  onClick={() => selectSingleStatus(status)}
                  className={`flex flex-col items-center gap-1 ${
                    isActive ? "text-blue-600" : "text-gray-500"
                  }`}
                >
                  <span className="text-xs font-medium">{tab}</span>
                  {isActive ? (
                    <div className="h-0.5 w-8 bg-blue-600" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </footer>
    </div>
  );
}
