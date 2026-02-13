"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { importOrdersFromCSV, parseCSV } from "@/lib/import-orders";

export default function ImportPage() {
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setMessage(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      setMessage("Please select a CSV file first.");
      return;
    }

    try {
      setIsImporting(true);
      setMessage(null);

      const text = await file.text();
      const orders = parseCSV(text);
      
      if (orders.length === 0) {
        setMessage("No orders found in the CSV file.");
        return;
      }

      await importOrdersFromCSV(orders);

      setMessage(`Successfully imported ${orders.length} orders!`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setMessage(`Import failed: ${errorMessage}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Import Orders</h1>
        <p className="text-gray-600 mb-6">
          Upload a CSV file with order data. The CSV should have the following columns:
          order_id, customer_id, details, status, delivery_date_time, photos, pickup_delivery, payment_status, price
        </p>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">CSV File</label>
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={isImporting}
            />
          </div>
          {file && (
            <p className="text-sm text-gray-600">Selected: {file.name}</p>
          )}
        </div>

        <Button onClick={handleImport} disabled={isImporting || !file}>
          {isImporting ? "Importing..." : "Import Orders"}
        </Button>

        {message && (
          <div
            className={`mt-4 p-4 rounded ${
              message.includes("Successfully")
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
