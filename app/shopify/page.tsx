"use client";

import { useEffect, useState } from "react";
import { AppMoreMenu } from "@/components/AppMoreMenu";
import { getShopifyStagedOrders, updateShopifyStagedOrder, approveShopifyStagedOrder, rejectShopifyStagedOrder } from "@/lib/supabase/shopify-orders";
import type { ShopifyStagedOrder } from "@/types/shopify";

function localDateTime(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default function ShopifyReviewPage() {
  const [orders, setOrders] = useState<ShopifyStagedOrder[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save review order"); }
  };

  const approve = async (order: ShopifyStagedOrder) => {
    try {
      await saveDraft(order);
      await approveShopifyStagedOrder(order);
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
        {loading ? <div className="py-12 text-center text-gray-500">Loading Shopify orders…</div> : null}
        {!loading && orders.length === 0 ? <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-500">No Shopify orders waiting for review.</div> : null}
        {orders.map((order) => {
          const isOpen = expanded === order.id;
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
              <div className="mt-3 grid gap-2 text-sm text-gray-600 sm:grid-cols-3"><span>{order.pickup_delivery}</span><span>{new Date(order.delivery_date_time).toLocaleString()}</span><span>{order.price == null ? "Price pending" : `$${Number(order.price).toFixed(2)}`}</span></div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-gray-800">{order.details || "No product details"}</p>
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
                <label className="text-sm font-medium">Date and time<input type="datetime-local" className="mt-1 w-full rounded-md border p-2 font-normal" value={localDateTime(order.delivery_date_time)} onChange={(e) => patchOrder(order.id, { delivery_date_time: new Date(e.target.value).toISOString() })} /></label>
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
