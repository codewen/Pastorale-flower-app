"use client";

import { useState, useMemo } from "react";
import { Order } from "@/types/order";
import { formatDate, formatCurrency } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { ArrowUp, ArrowDown } from "lucide-react";

interface OrderTableProps {
  orders: Order[];
  searchQuery?: string;
}

type SortColumn =
  | "delivery_date_time"
  | "pickup_delivery"
  | "customer_id"
  | "price"
  | "payment_status"
  | "details"
  | "status";

type SortDirection = "asc" | "desc";

export function OrderTable({ orders, searchQuery = "" }: OrderTableProps) {
  const router = useRouter();
  const [sortColumn, setSortColumn] = useState<SortColumn>("delivery_date_time");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const filteredOrders = useMemo(() => {
    let filtered = orders.filter((order) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        order.customer_id.toLowerCase().includes(query) ||
        order.details?.toLowerCase().includes(query) ||
        order.order_id.toLowerCase().includes(query)
      );
    });

    // Sort the filtered orders
    filtered = [...filtered].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case "delivery_date_time":
          aValue = new Date(a.delivery_date_time).getTime();
          bValue = new Date(b.delivery_date_time).getTime();
          break;
        case "price":
          aValue = a.price ?? 0;
          bValue = b.price ?? 0;
          break;
        case "pickup_delivery":
          aValue = a.pickup_delivery;
          bValue = b.pickup_delivery;
          break;
        case "customer_id":
          aValue = a.customer_id.toLowerCase();
          bValue = b.customer_id.toLowerCase();
          break;
        case "payment_status":
          aValue = a.payment_status;
          bValue = b.payment_status;
          break;
        case "details":
          aValue = (a.details || "").toLowerCase();
          bValue = (b.details || "").toLowerCase();
          break;
        case "status":
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [orders, searchQuery, sortColumn, sortDirection]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const handleRowClick = (orderId: string) => {
    router.push(`/orders/${orderId}`);
  };

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) return null;
    return sortDirection === "asc" ? (
      <ArrowUp className="h-3 w-3 ml-1 inline" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1 inline" />
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-200">
            <th
              className="text-left p-2 md:p-3 font-medium text-sm text-gray-700 cursor-pointer hover:bg-gray-50 select-none"
              onClick={() => handleSort("delivery_date_time")}
            >
              Date/Time
              <SortIcon column="delivery_date_time" />
            </th>
            <th
              className="text-left p-2 md:p-3 font-medium text-sm text-gray-700 cursor-pointer hover:bg-gray-50 select-none"
              onClick={() => handleSort("pickup_delivery")}
            >
              Pickup/Delivery
              <SortIcon column="pickup_delivery" />
            </th>
            <th
              className="text-left p-2 md:p-3 font-medium text-sm text-gray-700 cursor-pointer hover:bg-gray-50 select-none"
              onClick={() => handleSort("customer_id")}
            >
              Customer ID
              <SortIcon column="customer_id" />
            </th>
            <th
              className="text-left p-2 md:p-3 font-medium text-sm text-gray-700 cursor-pointer hover:bg-gray-50 select-none"
              onClick={() => handleSort("price")}
            >
              Price
              <SortIcon column="price" />
            </th>
            <th
              className="text-left p-2 md:p-3 font-medium text-sm text-gray-700 cursor-pointer hover:bg-gray-50 select-none"
              onClick={() => handleSort("payment_status")}
            >
              Payment Status
              <SortIcon column="payment_status" />
            </th>
            <th
              className="text-left p-2 md:p-3 font-medium text-sm text-gray-700 cursor-pointer hover:bg-gray-50 select-none"
              onClick={() => handleSort("details")}
            >
              Details
              <SortIcon column="details" />
            </th>
            <th
              className="text-left p-2 md:p-3 font-medium text-sm text-gray-700 cursor-pointer hover:bg-gray-50 select-none"
              onClick={() => handleSort("status")}
            >
              Status
              <SortIcon column="status" />
            </th>
          </tr>
        </thead>
        <tbody>
          {filteredOrders.length === 0 ? (
            <tr>
              <td colSpan={7} className="text-center p-6 md:p-8 text-gray-500">
                No orders found
              </td>
            </tr>
          ) : (
            filteredOrders.map((order) => (
              <tr
                key={order.id}
                onClick={() => handleRowClick(order.id)}
                className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="p-2 md:p-3 text-sm whitespace-nowrap">
                  {formatDate(order.delivery_date_time)}
                </td>
                <td className="p-2 md:p-3 text-sm">{order.pickup_delivery}</td>
                <td className="p-2 md:p-3 text-sm">{order.customer_id}</td>
                <td className="p-2 md:p-3 text-sm">{formatCurrency(order.price)}</td>
                <td className="p-2 md:p-3 text-sm">
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
                </td>
                <td className="p-2 md:p-3 text-sm max-w-md">
                  <div className="truncate" title={order.details || ""}>
                    {order.details || "-"}
                  </div>
                </td>
                <td className="p-2 md:p-3 text-sm">
                  <span className="inline-flex items-center">
                    {order.status}
                    <span className="ml-2">→</span>
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
