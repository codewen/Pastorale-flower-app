import type { OrderFormData } from "@/types/order";
import type { ShopifyOrder } from "./admin-api";

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

function parseTime(value: string | undefined): { hour: number; minute: number } | null {
  if (!value) return null;
  // Pickup windows such as “10am - 11am” are represented by their start time.
  const startTime = value.trim().split(/\s*(?:-|–|—|\bto\b)\s*/i)[0];
  const match = startTime.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const meridiem = match[3]?.toLowerCase();
  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  return hour >= 0 && hour <= 23 && minute <= 59 ? { hour, minute } : null;
}

function sydneyOffsetHours(year: number, month: number, day: number): number {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    timeZoneName: "shortOffset",
  }).formatToParts(new Date(Date.UTC(year, month - 1, day, 12)));
  const offset = parts.find((part) => part.type === "timeZoneName")?.value.match(/GMT([+-]\d+)/);
  return offset ? Number(offset[1]) : 10;
}

function parseDeliveryDate(dateValue: string | undefined, timeValue: string | undefined, fallback: string): string {
  if (!dateValue) return fallback;
  const match = dateValue.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (!match) return fallback;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const time = parseTime(timeValue) || { hour: 13, minute: 0 };
  const offset = sydneyOffsetHours(year, month, day);
  return new Date(Date.UTC(year, month - 1, day, time.hour - offset, time.minute)).toISOString();
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

export function mapShopifyOrder(order: ShopifyOrder): OrderFormData {
  const custom = attributes(order);
  const productLines = order.lineItems.nodes.flatMap((item) => {
    const variant = item.variant?.title && item.variant.title !== "Default Title" ? ` — ${item.variant.title}` : "";
    const productLine = `${item.title}${variant}${item.quantity > 1 ? ` × ${item.quantity}` : ""}`;
    const optionLines = (item.variant?.selectedOptions || [])
      .filter((option) => option.name && option.value)
      .map((option) => `${option.name}: ${option.value}`);
    return [productLine, ...optionLines];
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
  const delivery = attribute(custom, "delivery") || order.shippingLines.nodes[0]?.title || "delivery";
  const pickupDelivery = /pickup|pick up|store/i.test(delivery) ? "Pickup" : "Delivery";
  const details = [
    ...productLines,
    messageCard ? `Message Card: ${messageCard}` : "",
    pickupDelivery === "Delivery" && address ? `Address: ${address}` : "",
    deliveryInstructions ? `Delivery Instructions: ${deliveryInstructions}` : "",
    pickupDelivery === "Delivery" ? "Delivery Fee: 35" : "",
  ].filter(Boolean).join("\n");

  return {
    order_id: order.name,
    customer_id: orderCustomerId(order.name),
    details,
    status: mapStatus(order.displayFulfillmentStatus),
    delivery_date_time: parseDeliveryDate(custom.get("date"), custom.get("pickuptime"), order.createdAt),
    pickup_delivery: pickupDelivery,
    payment_status: mapPayment(order.displayFinancialStatus),
    // Use the merchandise subtotal only. Shopify's current total includes
    // shipping (and may include taxes), which should not be copied into the
    // app's order price.
    price: Number(order.subtotalPriceSet.shopMoney.amount) || null,
  };
}
