"use client";

import { useEffect, useState } from "react";
import { AppMoreMenu } from "@/components/AppMoreMenu";
import { getShopifyStagedOrders, updateShopifyStagedOrder, approveShopifyStagedOrder, rejectShopifyStagedOrder } from "@/lib/supabase/shopify-orders";
import type { ShopifyStagedOrder } from "@/types/shopify";
import { hasDeliveryDateTime, parseShopifyDeliveryDate, sydneyDateTimeInput } from "@/lib/order-date";
import { FormattedOrderDetails } from "@/components/FormattedOrderDetails";

export default function ShopifyReviewPage() {
  const [orders, setOrders] = useState<ShopifyStagedOrder[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [testOrderNumber, setTestOrderNumber] = useState("");
  const [syncingTestOrder, setSyncingTestOrder] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setOrders(await getShopifyStagedOrders());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load Shopify orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const patchOrder = (id: string, patch: Partial<ShopifyStagedOrder>) => {
    setOrders((current) => current.map((order) => order.id === id ? { ...order, ...patch } : order));
  };

  const saveDraft = async (order: ShopifyStagedOrder) => {
    try {
      const saved = await updateShopifyStagedOrder(order.id, {
        customer_id: order.customer_id,
        details: order.details,
        delivery_date_time: order.delivery_date_time,
        pickup_delivery: order.pickup_delivery,
        payment_status: order.payment_status,
        price: order.price,
        status: order.status,
      });
      patchOrder(order.id, saved);
      setMessage(`${order.order_id} saved for review.`);
      return saved;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save review order");
      return null;
    }
  };

  const approve = async (order: ShopifyStagedOrder) => {
    try {
      if (!hasDeliveryDateTime(order.delivery_date_time)) {
        setExpanded(order.id);
        setMessage("Confirm a valid delivery / pickup date and time before approving this order.");
        return;
      }
      const saved = await saveDraft(order);
      if (!saved) return;
      await approveShopifyStagedOrder(saved);
      setOrders((current) => current.filter((item) => item.id !== order.id));
      setExpanded(null);
      setMessage(`${order.order_id} added to manual orders.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not approve order"); }
  };

  const reject = async (order: ShopifyStagedOrder) => {
    try {
      await rejectShopifyStagedOrder(order.id);
      setOrders((current) => current.filter((item) => item.id !== order.id));
      setExpanded(null);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not reject order"); }
  };

  const syncExistingOrderForReview = async () => {
    try {
      setSyncingTestOrder(true);
      const response = await fetch("/api/shopify/review-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber: testOrderNumber }),
      });
      const result = await response.json() as { error?: string; orderName?: string; reviewStatus?: string };
      if (!response.ok) throw new Error(result.error || "Could not stage this Shopify order");
      setMessage(`${result.orderName} loaded from Shopify (${result.reviewStatus}).`);
      setTestOrderNumber("");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not stage this Shopify order");
    } finally {
      setSyncingTestOrder(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3 p-4">
          <AppMoreMenu />
          <div>
            <h1 className="text-xl font-semibold">Shopify Review</h1>
            <p className="text-sm text-gray-500">Review and edit new Shopify orders before they enter daily work.</p>
          </div>
          <span className="ml-auto rounded-full bg-orange-100 px-3 py-1 text-sm font-medium text-orange-700">{orders.length} to review</span>
        </div>
      </header>
      <main className="mx-auto max-w-4xl space-y-4 p-4">
        {message && <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">{message}</div>}
        <section className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
          <p className="text-sm font-medium text-slate-800">Test an existing Shopify order</p>
          <p className="mt-1 text-xs text-slate-600">Reads one existing order into Review only. It never edits Shopify or adds it to daily orders automatically.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              value={testOrderNumber}
              onChange={(event) => setTestOrderNumber(event.target.value)}
              placeholder="#7645"
              className="w-28 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
              aria-label="Shopify order number to test"
            />
            <button
              type="button"
              onClick={() => void syncExistingOrderForReview()}
              disabled={syncingTestOrder || !testOrderNumber.trim()}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              {syncingTestOrder ? "Loading…" : "Load into review"}
            </button>
          </div>
        </section>
        {loading ? <div className="py-12 text-center text-gray-500">Loading Shopify orders…</div> : null}
        {!loading && orders.length === 0 ? <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-500">No Shopify orders waiting for review.</div> : null}
        {orders.map((order) => {
          const isOpen = expanded === order.id;
          const dateTimeConfirmed = hasDeliveryDateTime(order.delivery_date_time);
          return <article key={order.id} className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div
              className="w-full cursor-pointer p-4 text-left"
              role="button"
              tabIndex={0}
              onClick={() => setExpanded(isOpen ? null : order.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") setExpanded(isOpen ? null : order.id);
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div><div className="font-semibold">{order.order_id}</div><div className="mt-1 text-sm text-gray-600">{order.customer_id}</div></div>
                <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-medium text-orange-700">{order.review_status}</span>
              </div>
              <div className="mt-3 grid gap-2 text-sm text-gray-600 sm:grid-cols-3"><span>{order.pickup_delivery}</span><span>{dateTimeConfirmed ? `${new Date(order.delivery_date_time!).toLocaleString("en-AU", { timeZone: "Australia/Sydney" })} (Sydney)` : "Date / time needs confirmation"}</span><span>{order.price == null ? "Price pending" : `$${Number(order.price).toFixed(2)}`}</span></div>
              {!dateTimeConfirmed && <p className="mt-2 text-sm text-amber-800">Confirm the delivery / pickup date and time before adding this order to daily work.</p>}
              {order.details
                ? <FormattedOrderDetails
                    details={order.details}
                    className="mt-3 text-sm text-gray-800"
                    orderId={order.order_id}
                    recipientName={order.recipient_name}
                    recipientPhone={order.recipient_phone}
                    deliveryAddressLine1={order.delivery_address_line_1}
                    deliveryAddressLine2={order.delivery_address_line_2}
                  />
                : <p className="mt-3 text-sm text-gray-800">No product details</p>}
              {(() => {
                const items = order.raw_order && typeof order.raw_order === "object"
                  ? (order.raw_order as { lineItems?: { nodes?: Array<{ image?: { url?: string } | null; variant?: { image?: { url?: string } | null; product?: { featuredImage?: { url?: string } | null } | null } | null }> } }).lineItems?.nodes || []
                  : [];
                const images = Array.from(new Set(items.map((item) => item.image?.url || item.variant?.image?.url || item.variant?.product?.featuredImage?.url).filter((url): url is string => Boolean(url))));
                return images.length > 0 ? <div className="mt-3 flex gap-2 overflow-x-auto">{images.map((url) => <img key={url} src={url} alt="Shopify product" className="h-20 w-20 rounded-md border object-cover" />)}</div> : null;
              })()}
              <p className="mt-3 text-xs text-gray-500">Click to expand and edit this order.</p>
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 px-4 py-3">
              <button onClick={() => reject(order)} className="rounded-md border border-red-200 px-3 py-2 text-sm text-red-700">Reject</button>
              <button onClick={() => saveDraft(order)} className="rounded-md border px-3 py-2 text-sm">Save draft</button>
              <button onClick={() => approve(order)} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white">Approve & add to orders</button>
            </div>
            {isOpen && <div className="space-y-4 border-t border-gray-100 p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium">Customer<input className="mt-1 w-full rounded-md border p-2 font-normal" value={order.customer_id} onChange={(e) => patchOrder(order.id, { customer_id: e.target.value })} /></label>
                <label className="text-sm font-medium">Delivery / pickup<select className="mt-1 w-full rounded-md border p-2 font-normal" value={order.pickup_delivery} onChange={(e) => patchOrder(order.id, { pickup_delivery: e.target.value as ShopifyStagedOrder["pickup_delivery"] })}><option>Pickup</option><option>Delivery</option></select></label>
                <label className="text-sm font-medium">Date and time (Sydney)<input type="datetime-local" className="mt-1 w-full rounded-md border p-2 font-normal" value={sydneyDateTimeInput(order.delivery_date_time)} onChange={(e) => {
                  const [date, time] = e.target.value.split("T");
                  const timestamp = parseShopifyDeliveryDate(date, time);
                  patchOrder(order.id, { delivery_date_time: timestamp });
                  if (e.target.value && !timestamp) setMessage("This Sydney date and time is invalid or ambiguous. Please select another time.");
                }} /></label>
                <label className="text-sm font-medium">Price<input type="number" step="0.01" className="mt-1 w-full rounded-md border p-2 font-normal" value={order.price ?? ""} onChange={(e) => patchOrder(order.id, { price: e.target.value === "" ? null : Number(e.target.value) })} /></label>
              </div>
              <label className="block text-sm font-medium">Order details<textarea className="mt-1 min-h-28 w-full rounded-md border p-2 font-normal" value={order.details || ""} onChange={(e) => patchOrder(order.id, { details: e.target.value })} /></label>
            </div>}
          </article>;
        })}
      </main>
    </div>
  );
}
