import { createClient } from "@supabase/supabase-js";
import { OrderFormData } from "@/types/order";
import { parseCsvDeliveryDate } from "./order-date";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key must be provided");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface CSVOrderRow {
  order_id: string;
  customer_id: string;
  details: string;
  status: string;
  delivery_date_time: string;
  photos: string;
  pickup_delivery: string;
  payment_status: string;
  price: string;
}

function parsePrice(priceString: string): number | null {
  if (!priceString || priceString.trim() === "") return null;
  const cleaned = priceString.replace(/[^0-9.]/g, "");
  return cleaned ? parseFloat(cleaned) : null;
}

function parsePhotos(photosString: string): string[] {
  if (!photosString || photosString.trim() === "") return [];
  // Split by comma, newline, or semicolon; strip surrounding quotes and whitespace
  return photosString
    .split(/[,;\n]+/)
    .map((p) => p.replace(/^\s*["']|["']\s*$/g, "").trim())
    .filter((p) => p.length > 0);
}

/**
 * Relation between CSV path and AppSheet image URL:
 * - CSV path:   Orders_Images/82d7867d.Photo.043722.jpg
 * - URL param: fileName=Orders_Images%2F82d7867d.Photo.043722.jpg  (path with / → %2F)
 * - Full URL:  https://www.appsheet.com/image/getimageurl?appName=...&tableName=Orders&fileName=<encoded path>&...
 */
function buildAppSheetImageUrl(path: string): string | null {
  const appName = process.env.NEXT_PUBLIC_APPSHEET_IMAGE_APP_NAME;
  const tableName = process.env.NEXT_PUBLIC_APPSHEET_IMAGE_TABLE_NAME || "Orders";
  const appVersion = process.env.NEXT_PUBLIC_APPSHEET_IMAGE_APP_VERSION;
  const signature = process.env.NEXT_PUBLIC_APPSHEET_IMAGE_SIGNATURE;
  if (!appName || !path) return null;
  const fileName = encodeURIComponent(path.trim());
  let url = `https://www.appsheet.com/image/getimageurl?appName=${encodeURIComponent(appName)}&tableName=${encodeURIComponent(tableName)}&fileName=${fileName}`;
  if (appVersion) url += `&appVersion=${encodeURIComponent(appVersion)}`;
  if (signature) url += `&signature=${encodeURIComponent(signature.trim())}`;
  return url;
}

/** If the photo is an external URL (e.g. Google or AppSheet), fetch and upload to Supabase via API; return the new URL. If it's an AppSheet path and env is set, build getimageurl and try that. Otherwise return as-is. */
async function resolvePhotoUrl(photo: string): Promise<string> {
  const trimmed = photo.trim();
  if (!trimmed) return trimmed;

  let urlToFetch: string;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    urlToFetch = trimmed;
  } else {
    const appSheetUrl = buildAppSheetImageUrl(trimmed);
    if (!appSheetUrl) return trimmed;
    urlToFetch = appSheetUrl;
  }

  try {
    const res = await fetch("/api/import-photo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: urlToFetch }),
    });
    const data = await res.json();
    if (!res.ok) return trimmed;
    return typeof data?.url === "string" ? data.url : trimmed;
  } catch {
    return trimmed;
  }
}

export async function importOrdersFromCSV(csvData: CSVOrderRow[]): Promise<void> {
  const errors: string[] = [];
  let successCount = 0;

  for (const row of csvData) {
    try {
      // Skip empty rows
      if (!row.order_id || row.order_id.trim() === "") {
        continue;
      }

      const rawPhotos = parsePhotos(row.photos || "");
      const photos = await Promise.all(rawPhotos.map(resolvePhotoUrl));

      const { error } = await supabase.from("orders").insert({
        source: "manual",
        order_id: row.order_id.trim(),
        customer_id: row.customer_id || "",
        details: row.details || null,
        status: (row.status as "Ordered" | "Ready" | "Done") || "Done",
        delivery_date_time: parseCsvDeliveryDate(row.delivery_date_time),
        pickup_delivery: (row.pickup_delivery as "Pickup" | "Delivery") || "Pickup",
        payment_status: (row.payment_status as "Paid" | "Unpaid" | "Pending") || "Paid",
        price: parsePrice(row.price),
        photos: photos,
      });

      if (error) {
        errors.push(`Failed to import order ${row.order_id}: ${error.message}`);
      } else {
        successCount++;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`Error importing order ${row.order_id}: ${errorMessage}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Failed to import ${errors.length} orders. ${successCount} orders imported successfully. Errors: ${errors.slice(0, 5).join("; ")}${errors.length > 5 ? ` and ${errors.length - 5} more...` : ""}`
    );
  }
}

function generateOrderId(): string {
  return Math.random().toString(36).substring(2, 10);
}

// CSV Parser - handles comma-separated values with proper quote handling
export function parseCSV(csvText: string): CSVOrderRow[] {
  const lines: string[] = [];
  let currentLine = "";
  let inQuotes = false;

  // First, properly handle multi-line CSV entries
  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      inQuotes = !inQuotes;
      currentLine += char;
    } else if (char === "\n" && !inQuotes) {
      if (currentLine.trim()) {
        lines.push(currentLine);
      }
      currentLine = "";
    } else {
      currentLine += char;
    }
  }
  if (currentLine.trim()) {
    lines.push(currentLine);
  }

  if (lines.length < 2) return [];

  // Parse header
  const headers = parseCSVLine(lines[0]);
  const orders: CSVOrderRow[] = [];

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    
    if (values.length < headers.length) {
      // Pad with empty strings if needed
      while (values.length < headers.length) {
        values.push("");
      }
    }

    const order: Partial<CSVOrderRow> = {
      order_id: "",
      customer_id: "",
      details: "",
      status: "",
      delivery_date_time: "",
      photos: "",
      pickup_delivery: "",
      payment_status: "",
      price: "",
    };

    // Map every CSV column to CSVOrderRow (Order ID, Customer ID, Details, Status, Delivery Date/Time, Photo, Pickup/Delivery, Payment Status, Price, More Photo)
    headers.forEach((header, index) => {
      const headerKey = header.toLowerCase().trim();
      const value = values[index]?.trim() || "";
      
      if (headerKey === "order_id" || headerKey === "order id") {
        order.order_id = value;
      } else if (headerKey === "customer_id" || headerKey === "customer id") {
        order.customer_id = value;
      } else if (headerKey === "details") {
        order.details = value;
      } else if (headerKey === "status") {
        order.status = value;
      } else if (headerKey === "delivery_date_time" || headerKey === "delivery date time" || headerKey === "delivery date/time" || headerKey === "delivery_date" || headerKey === "delivery date") {
        order.delivery_date_time = value;
      } else if (headerKey === "photos" || headerKey === "photo") {
        order.photos = order.photos ? `${order.photos},${value}` : value;
      } else if (headerKey === "more photo" || headerKey === "morephoto") {
        order.photos = order.photos ? `${order.photos},${value}` : value;
      } else if (headerKey === "pickup_delivery" || headerKey === "pickup delivery" || headerKey === "pickup/delivery") {
        order.pickup_delivery = value;
      } else if (headerKey === "payment_status" || headerKey === "payment status" || headerKey === "payment/status") {
        order.payment_status = value;
      } else if (headerKey === "price") {
        order.price = value;
      }
    });

    // Only add if order_id exists
    if (order.order_id && order.order_id.trim() !== "") {
      orders.push(order as CSVOrderRow);
    }
  }

  return orders;
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let currentValue = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        currentValue += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      // End of field
      values.push(currentValue);
      currentValue = "";
    } else {
      currentValue += char;
    }
  }
  
  // Add the last value
  values.push(currentValue);

  return values;
}

// Legacy function for backward compatibility
export async function importOrders(ordersData: CSVOrderRow[]): Promise<void> {
  // This is for the old format, convert if needed
  return importOrdersFromCSV(ordersData);
}

// Legacy parser for tab-separated data
export function parseOrderData(tableData: string): CSVOrderRow[] {
  const lines = tableData.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split("\t").map((h) => h.trim());
  const orders: CSVOrderRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values: string[] = [];
    let currentValue = "";
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
        currentValue += char;
      } else if (char === "\t" && !inQuotes) {
        values.push(currentValue);
        currentValue = "";
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue);

    while (values.length < headers.length) {
      values.push("");
    }

    const order: Partial<CSVOrderRow> = {
      order_id: "",
      customer_id: "",
      details: "",
      status: "",
      delivery_date_time: "",
      photos: "",
      pickup_delivery: "",
      payment_status: "",
      price: "",
    };

    headers.forEach((header, index) => {
      let value = values[index]?.trim() || "";
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      
      const headerKey = header.toLowerCase().trim();
      // Map headers to CSVOrderRow fields (handles both "Order ID" and "order_id" formats)
      if (headerKey === "order_id" || headerKey === "order id") {
        order.order_id = value;
      } else if (headerKey === "customer_id" || headerKey === "customer id") {
        order.customer_id = value;
      } else if (headerKey === "details") {
        order.details = value;
      } else if (headerKey === "status") {
        order.status = value;
      } else if (headerKey === "delivery_date_time" || headerKey === "delivery date time" || headerKey === "delivery date/time" || headerKey === "delivery_date" || headerKey === "delivery date") {
        order.delivery_date_time = value;
      } else if (headerKey === "photos" || headerKey === "photo") {
        order.photos = order.photos ? `${order.photos},${value}` : value;
      } else if (headerKey === "more photo" || headerKey === "morephoto") {
        order.photos = order.photos ? `${order.photos},${value}` : value;
      } else if (headerKey === "pickup_delivery" || headerKey === "pickup delivery" || headerKey === "pickup/delivery") {
        order.pickup_delivery = value;
      } else if (headerKey === "payment_status" || headerKey === "payment status" || headerKey === "payment/status") {
        order.payment_status = value;
      } else if (headerKey === "price") {
        order.price = value;
      }
    });

    if (order.order_id && order.order_id.trim() !== "") {
      orders.push(order as CSVOrderRow);
    }
  }

  return orders;
}
