import { importOrders, parseOrderData } from "@/lib/import-orders";
import * as fs from "fs";
import * as path from "path";

// This script can be run with: npx tsx scripts/import-data.ts <path-to-data-file>
async function main() {
  const args = process.argv.slice(2);
  const dataFilePath = args[0];

  if (!dataFilePath) {
    // eslint-disable-next-line no-console
    console.error("Usage: npx tsx scripts/import-data.ts <path-to-data-file>");
    process.exit(1);
  }

  try {
    const filePath = path.resolve(dataFilePath);
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const orders = parseOrderData(fileContent);

    // eslint-disable-next-line no-console
    console.log(`Parsed ${orders.length} orders. Starting import...`);
    await importOrders(orders);
    // eslint-disable-next-line no-console
    console.log(`Successfully imported ${orders.length} orders!`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    // eslint-disable-next-line no-console
    console.error("Import failed:", errorMessage);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
