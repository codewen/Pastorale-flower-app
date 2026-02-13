import { importOrders, parseOrderData } from "@/lib/import-orders";
import * as fs from "fs";
import * as path from "path";

// This script can be run with: npx tsx scripts/import-data.ts <path-to-data-file>
async function main() {
  const args = process.argv.slice(2);
  const dataFilePath = args[0];

  if (!dataFilePath) {
    console.error("Usage: npx tsx scripts/import-data.ts <path-to-data-file>");
    process.exit(1);
  }

  try {
    const filePath = path.resolve(dataFilePath);
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const orders = parseOrderData(fileContent);

    console.log(`Parsed ${orders.length} orders. Starting import...`);
    await importOrders(orders);
    console.log(`Successfully imported ${orders.length} orders!`);
  } catch (error: any) {
    console.error("Import failed:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
