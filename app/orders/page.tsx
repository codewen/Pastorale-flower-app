"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { OrderTable } from "@/components/OrderTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getOrders } from "@/lib/supabase/orders";
import { Order } from "@/types/order";
import { Plus, Search, RefreshCw } from "lucide-react";

type StatusFilter = "Ordered" | "Ready" | "Done" | "All";

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Ordered");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    let filtered = orders;
    if (statusFilter !== "All") {
      filtered = filtered.filter((order) => order.status === statusFilter);
    }
    setFilteredOrders(filtered);
  }, [orders, statusFilter]);

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      const allOrders = await getOrders();
      setOrders(allOrders);
      setFilteredOrders(allOrders);
    } catch (error) {
      console.error("Failed to load orders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusFilter = (status: StatusFilter) => {
    setStatusFilter(status);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-xl font-semibold">Order</h1>
          <div className="flex items-center gap-2">
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

      {/* Status Tabs */}
      <div className="flex border-b border-gray-200">
        {(["Ordered", "Ready", "Done"] as const).map((status) => (
          <button
            key={status}
            onClick={() => handleStatusFilter(status)}
            className={`flex-1 py-3 text-center font-medium text-sm transition-colors ${
              statusFilter === status
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <main className="p-4">
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
            {(["Order", "Ready", "Done"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  if (tab === "Order") {
                    handleStatusFilter("Ordered");
                  } else {
                    handleStatusFilter(tab as StatusFilter);
                  }
                }}
                className={`flex flex-col items-center gap-1 ${
                  (tab === "Order" && statusFilter === "Ordered") ||
                  (tab === statusFilter)
                    ? "text-blue-600"
                    : "text-gray-500"
                }`}
              >
                <span className="text-xs font-medium">{tab}</span>
                {(tab === "Order" && statusFilter === "Ordered") ||
                (tab === statusFilter) ? (
                  <div className="h-0.5 w-8 bg-blue-600" />
                ) : null}
              </button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
