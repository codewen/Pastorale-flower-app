import { createClient } from "@supabase/supabase-js";
import { OrderFormData } from "@/types/order";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key must be provided");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// CSV date/times are always treated as Australia/Sydney (UTC+11) and converted to UTC for storage.
const SYDNEY_UTC_OFFSET_HOURS = 11;

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

function parseDate(dateString: string): string {
  if (!dateString || dateString.trim() === "") {
    const now = new Date();
    const formatted = now.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "+00");
    return formatted;
  }

  try {
    // Formats: "10/25/2023 13:00:00", "10/25/2023 13:00", "2/03/2026 9:34 PM", "7/02/2026 10:00 AM"
    const trimmed = dateString.trim();
    const parts = trimmed.split(/\s+/);
    if (parts.length < 2) {
      const now = new Date();
      return now.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "+00");
    }

    const datePart = parts[0];
    let timePart = parts[1];
    let amPm = parts[2]?.toUpperCase() ?? null;
    // Also support "9:34PM" or "9:34 AM" (AM/PM may be in timePart)
    if (!amPm && /(AM|PM)$/i.test(timePart)) {
      amPm = timePart.slice(-2).toUpperCase();
      timePart = timePart.slice(0, -2).trim();
    }

    const [month, day, year] = datePart.split("/").map((s) => s.trim());
    if (!month || !day || !year) {
      const now = new Date();
      return now.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "+00");
    }

    const timeSegments = timePart.split(":").map((s) => s.trim());
    const hourRaw = parseInt(timeSegments[0], 10);
    const minuteNum = parseInt(timeSegments[1], 10) || 0;
    const secondNum = parseInt(timeSegments[2], 10) || 0;

    // 12-hour format: "9:34 PM" -> 21:34, "12:00 AM" -> 0, "12:00 PM" -> 12
    let hourNum = hourRaw;
    if (amPm === "AM" || amPm === "PM") {
      if (amPm === "AM") {
        hourNum = hourRaw === 12 ? 0 : hourRaw;
      } else {
        hourNum = hourRaw === 12 ? 12 : hourRaw + 12;
      }
    }

    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);
    const dayNum = parseInt(day, 10);

    if (Number.isNaN(yearNum) || Number.isNaN(monthNum) || Number.isNaN(dayNum) || Number.isNaN(hourNum) || Number.isNaN(minuteNum)) {
      const now = new Date();
      return now.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "+00");
    }

    // Build UTC moment from parsed components; if CSV is in a fixed timezone (e.g. Australia/Sydney),
    // subtract that offset so we store true UTC and display shows correct local time.
    let d = new Date(Date.UTC(yearNum, monthNum - 1, dayNum, hourNum, minuteNum, secondNum));
    d = new Date(d.getTime() - SYDNEY_UTC_OFFSET_HOURS * 3600 * 1000);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dDay = String(d.getUTCDate()).padStart(2, "0");
    const h = String(d.getUTCHours()).padStart(2, "0");
    const min = String(d.getUTCMinutes()).padStart(2, "0");
    const s = String(d.getUTCSeconds()).padStart(2, "0");
    return `${y}-${m}-${dDay} ${h}:${min}:${s}+00`;
  } catch (error) {
    const now = new Date();
    return now.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "+00");
  }
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

export async function importOrdersFromCSV(csvData: CSVOrderRow[]): Promise<void> {
  const errors: string[] = [];
  let successCount = 0;

  for (const row of csvData) {
    try {
      // Skip empty rows
      if (!row.order_id || row.order_id.trim() === "") {
        continue;
      }

      const photos = parsePhotos(row.photos || "");

      const { error } = await supabase.from("orders").insert({
        order_id: row.order_id.trim(),
        customer_id: row.customer_id || "",
        details: row.details || null,
        status: (row.status as "Ordered" | "Ready" | "Done") || "Done",
        delivery_date_time: parseDate(row.delivery_date_time),
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
