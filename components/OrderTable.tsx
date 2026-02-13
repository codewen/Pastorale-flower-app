"use client";

import { Order } from "@/types/order";
import { formatDate, formatCurrency } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface OrderTableProps {
  orders: Order[];
  searchQuery?: string;
}

export function OrderTable({ orders, searchQuery = "" }: OrderTableProps) {
  const router = useRouter();

  const filteredOrders = orders.filter((order) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      order.customer_id.toLowerCase().includes(query) ||
      order.details?.toLowerCase().includes(query) ||
      order.order_id.toLowerCase().includes(query)
    );
  });

  const handleRowClick = (orderId: string) => {
    router.push(`/orders/${orderId}`);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left p-3 font-medium text-sm text-gray-700">
              Date/Time
            </th>
            <th className="text-left p-3 font-medium text-sm text-gray-700">
              Pickup/Delivery
            </th>
            <th className="text-left p-3 font-medium text-sm text-gray-700">
              Customer ID
            </th>
            <th className="text-left p-3 font-medium text-sm text-gray-700">
              Price
            </th>
            <th className="text-left p-3 font-medium text-sm text-gray-700">
              Payment Status
            </th>
            <th className="text-left p-3 font-medium text-sm text-gray-700">
              Details
            </th>
            <th className="text-left p-3 font-medium text-sm text-gray-700">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {filteredOrders.length === 0 ? (
            <tr>
              <td colSpan={7} className="text-center p-8 text-gray-500">
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
                <td className="p-3 text-sm">{formatDate(order.delivery_date_time)}</td>
                <td className="p-3 text-sm">{order.pickup_delivery}</td>
                <td className="p-3 text-sm">{order.customer_id}</td>
                <td className="p-3 text-sm">{formatCurrency(order.price)}</td>
                <td className="p-3 text-sm">
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
                <td className="p-3 text-sm max-w-md">
                  <div className="truncate" title={order.details || ""}>
                    {order.details || "-"}
                  </div>
                </td>
                <td className="p-3 text-sm">
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
