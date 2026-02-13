import { createClient } from "@supabase/supabase-js";
import { OrderFormData } from "@/types/order";

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

function parseDate(dateString: string): string {
  if (!dateString || dateString.trim() === "") {
    const now = new Date();
    const formatted = now.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "+00");
    return formatted;
  }

  try {
    // Format: "10/25/2023 13:00:00" or "10/25/2023 13:00"
    const parts = dateString.trim().split(" ");
    if (parts.length < 2) {
      const now = new Date();
      return now.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "+00");
    }

    const [datePart, timePart] = parts;
    const [month, day, year] = datePart.split("/");
    const [hour, minute, second] = timePart.split(":");

    // Create date as UTC to preserve the exact time values
    // Format: "2026-02-13 01:27:54+00"
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    const dayNum = parseInt(day);
    const hourNum = parseInt(hour);
    const minuteNum = parseInt(minute);
    const secondNum = parseInt(second) || 0;

    // Format directly as PostgreSQL timestamp: "YYYY-MM-DD HH:MM:SS+00"
    const formatted = `${yearNum}-${String(monthNum).padStart(2, "0")}-${String(dayNum).padStart(2, "0")} ${String(hourNum).padStart(2, "0")}:${String(minuteNum).padStart(2, "0")}:${String(secondNum).padStart(2, "0")}+00`;
    
    return formatted;
  } catch (error) {
    console.warn(`Failed to parse date: ${dateString}`, error);
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
  // Photos might be a single path or comma-separated paths
  return photosString
    .split(",")
    .map((p) => p.trim())
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
        status: (row.status as any) || "Done",
        delivery_date_time: parseDate(row.delivery_date_time),
        pickup_delivery: (row.pickup_delivery as any) || "Pickup",
        payment_status: (row.payment_status as any) || "Paid",
        price: parsePrice(row.price),
        photos: photos,
      });

      if (error) {
        errors.push(`Failed to import order ${row.order_id}: ${error.message}`);
      } else {
        successCount++;
      }
    } catch (error: any) {
      errors.push(`Error importing order ${row.order_id}: ${error.message}`);
    }
  }

  if (errors.length > 0) {
    console.error("Import errors:", errors);
    throw new Error(
      `Failed to import ${errors.length} orders. ${successCount} orders imported successfully. See console for details.`
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

    const order: any = {};
    headers.forEach((header, index) => {
      const headerKey = header.toLowerCase().trim();
      order[headerKey] = values[index]?.trim() || "";
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
export async function importOrders(ordersData: any[]): Promise<void> {
  // This is for the old format, convert if needed
  return importOrdersFromCSV(ordersData as CSVOrderRow[]);
}

// Legacy parser for tab-separated data
export function parseOrderData(tableData: string): any[] {
  const lines = tableData.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split("\t").map((h) => h.trim());
  const orders: any[] = [];

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

    const order: any = {};
    headers.forEach((header, index) => {
      let value = values[index]?.trim() || "";
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      order[header] = value;
    });

    if (order["Order ID"] && order["Order ID"].trim() !== "") {
      orders.push(order);
    }
  }

  return orders;
}
