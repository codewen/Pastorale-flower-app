import type { OrderFormData } from "@/types/order";
import type { ShopifyOrder } from "./admin-api";
import { parseShopifyDeliveryDate, parseShopifyDeliveryDateWithDefaultTime } from "../order-date";

function attributes(order: ShopifyOrder): Map<string, string> {
  return new Map(order.customAttributes.map(({ key, value }) => [key.trim().toLowerCase().replace(/[^a-z0-9]/g, ""), value.trim()]));
}

function attribute(attributesMap: Map<string, string>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = attributesMap.get(key.replace(/[^a-z0-9]/gi, "").toLowerCase());
    if (value) return value;
  }
  return undefined;
}

function instructionAttribute(attributesMap: Map<string, string>): string | undefined {
  for (const [key, value] of attributesMap) {
    if (value && /(delivery)?(instruction|note)|specialinstruction/.test(key)) return value;
  }
  return undefined;
}

function orderCustomerId(orderName: string): string {
  const digits = orderName.replace(/\D/g, "");
  return `#${digits.padStart(4, "0")}`;
}

function mapStatus(status: string | null): OrderFormData["status"] {
  if (status === "FULFILLED") return "Done";
  if (status === "PARTIALLY_FULFILLED" || status === "IN_PROGRESS") return "Ready";
  return "Ordered";
}

function mapPayment(status: string | null): OrderFormData["payment_status"] {
  if (status === "PAID") return "Paid";
  if (status === "REFUNDED" || status === "VOIDED") return "Unpaid";
  return "Pending";
}

export type MappedShopifyOrder = Omit<OrderFormData, "delivery_date_time"> & { delivery_date_time: string | null };

export function mapShopifyOrder(order: ShopifyOrder): MappedShopifyOrder {
  const custom = attributes(order);
  const productLines = order.lineItems.nodes.flatMap((item) => {
    const variant = item.variant?.title && item.variant.title !== "Default Title" ? ` — ${item.variant.title}` : "";
    const productLine = `${item.title}${variant}${item.quantity > 1 ? ` × ${item.quantity}` : ""}`;
    const optionLines = (item.variant?.selectedOptions || [])
      .filter((option) => option.name && option.value)
      .map((option) => `${option.name}: ${option.value}`);
    // Shopify product-form fields are line-item custom attributes. Keeping
    // them beside the product makes a flower colour unambiguous in multi-item
    // orders, and also supports custom options added without a paid app.
    const customOptionLines = (item.customAttributes || [])
      .filter(({ key, value }) => key && value && !key.startsWith("_"))
      .map(({ key, value }) => `${key}: ${value}`);
    return [productLine, ...optionLines, ...customOptionLines];
  });
  const messageCard = attribute(custom, "messagecard", "message card", "card message");
  const deliveryInstructions = attribute(
    custom,
    "deliveryinstructions",
    "delivery instructions",
    "delivery_instruction",
    "delivery instruction",
  ) || instructionAttribute(custom) || order.note?.trim();
  const address = order.shippingAddress
    ? [
        order.shippingAddress.address1,
        order.shippingAddress.address2,
        order.shippingAddress.city,
        [order.shippingAddress.province, order.shippingAddress.zip].filter(Boolean).join(" "),
      ].filter(Boolean).join(", ")
    : "";
  // Checkout decides fulfilment. Shopify omits shippingAddress for local
  // pickup, while the shipping-line title can be only the location name (for
  // example "Chippendale shop") and therefore cannot reliably identify it.
  // Cart attributes are only a fallback for older orders with no checkout data.
  const checkoutShippingLine = order.shippingLines.nodes.find((line) => line.title?.trim())?.title;
  const cartDelivery = attribute(custom, "delivery") || "delivery";
  const pickupDelivery = order.shippingAddress
    ? "Delivery"
    : checkoutShippingLine
      ? "Pickup"
      : /pickup|pick up|store/i.test(cartDelivery)
        ? "Pickup"
        : "Delivery";
  const requestedDate = attribute(custom, "date", "deliverydate", "pickupdate");
  const requestedTime = pickupDelivery === "Pickup"
    ? attribute(custom, "pickuptime", "time", "deliverytime")
    : undefined;
  const deliveryDateTime = pickupDelivery === "Delivery"
    ? parseShopifyDeliveryDateWithDefaultTime(requestedDate)
    : parseShopifyDeliveryDate(requestedDate, requestedTime);
  const subtotalAmount = order.subtotalPriceSet?.shopMoney.amount;
  const subtotal = subtotalAmount?.trim() ? Number(subtotalAmount) : NaN;
  const details = [
    ...productLines,
    !deliveryDateTime && requestedDate ? `Requested date: ${requestedDate}` : "",
    !deliveryDateTime && requestedTime ? `Requested time: ${requestedTime}` : "",
    messageCard ? `Message Card: ${messageCard}` : "",
    pickupDelivery === "Delivery" && address ? `Address: ${address}` : "",
    deliveryInstructions ? `Delivery Instructions: ${deliveryInstructions}` : "",
    pickupDelivery === "Delivery" ? `Delivery Fee: ${Number(order.currentShippingPriceSet.shopMoney.amount)}` : "",
  ].filter(Boolean).join("\n");

  return {
    order_id: order.name,
    customer_id: orderCustomerId(order.name),
    details,
    status: mapStatus(order.displayFulfillmentStatus),
    delivery_date_time: deliveryDateTime,
    pickup_delivery: pickupDelivery,
    payment_status: mapPayment(order.displayFinancialStatus),
    is_bundled: false,
    is_made: false,
    is_missing_flowers: false,
    is_prepared: false,
    // Use the merchandise subtotal only. Shopify's current total includes
    // shipping (and may include taxes), which should not be copied into the
    // app's order price.
    price: Number.isFinite(subtotal) ? subtotal : null,
  };
}
