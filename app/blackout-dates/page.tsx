"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { AppMoreMenu } from "@/components/AppMoreMenu";
import { BlackoutCalendar } from "@/components/BlackoutCalendar";
import type { BlackoutDate } from "@/types/blackout-date";

export default function BlackoutDatesPage() {
  const [entries, setEntries] = useState<BlackoutDate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadEntries = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/blackout-dates?format=admin");
      if (!response.ok) {
        throw new Error("Failed to load blackout dates");
      }
      const data = (await response.json()) as { entries: BlackoutDate[] };
      setEntries(data.entries ?? []);
      setMessage(null);
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Failed to load blackout dates.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const handleSave = async (payload: {
    id?: string;
    date: string;
    disable_pickup: boolean;
    disable_delivery: boolean;
    pickup_start_hour: number | null;
    notes: string | null;
  }) => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/blackout-dates", {
        method: payload.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to save");
      }
      await loadEntries();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/blackout-dates?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to delete");
      }
      await loadEntries();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white min-w-0">
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="flex items-center justify-between gap-2 p-3 md:p-4">
          <div className="flex items-center gap-2 min-w-0">
            <AppMoreMenu />
            <h1 className="text-xl font-semibold truncate">Blackout Dates</h1>
          </div>
          <button
            type="button"
            onClick={loadEntries}
            className="p-2 hover:bg-gray-100 rounded"
            title="Refresh"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="p-3 md:p-4 pb-8 max-w-3xl mx-auto">
        {message ? (
          <div className="mb-4 p-4 rounded bg-red-100 text-red-800">{message}</div>
        ) : null}
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">
            Loading blackout dates...
          </div>
        ) : (
          <BlackoutCalendar
            entries={entries}
            onSave={handleSave}
            onDelete={handleDelete}
            isSaving={isSaving}
          />
        )}
      </main>
    </div>
  );
}
