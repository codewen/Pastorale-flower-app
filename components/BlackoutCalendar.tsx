"use client";

import { useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";
import {
  addDays,
  format,
  isBefore,
  parseISO,
  startOfDay,
} from "date-fns";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDisplayDate } from "@/lib/blackout-dates-format";
import type { BlackoutDate, BlackoutDayKind } from "@/types/blackout-date";
import "react-day-picker/dist/style.css";

type BlackoutCalendarProps = {
  entries: BlackoutDate[];
  onSave: (payload: {
    id?: string;
    date: string;
    disable_pickup: boolean;
    disable_delivery: boolean;
    pickup_start_hour: number | null;
    notes: string | null;
  }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  isSaving?: boolean;
};

function getDayKind(entry: BlackoutDate | undefined): BlackoutDayKind {
  if (!entry) return "none";
  if (entry.disable_pickup && entry.disable_delivery) return "both";
  if (entry.disable_delivery && !entry.disable_pickup) return "delivery";
  if (
    entry.pickup_start_hour != null &&
    !entry.disable_pickup &&
    !entry.disable_delivery
  ) {
    return "partial";
  }
  if (entry.disable_pickup || entry.disable_delivery) return "both";
  return "none";
}

function dateToIso(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function entryByDate(entries: BlackoutDate[]): Map<string, BlackoutDate> {
  return new Map(entries.map((entry) => [entry.date, entry]));
}

export function BlackoutCalendar({
  entries,
  onSave,
  onDelete,
  isSaving = false,
}: BlackoutCalendarProps) {
  const today = startOfDay(new Date());
  const maxDate = addDays(today, 60);
  const entryMap = useMemo(() => entryByDate(entries), [entries]);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [disablePickup, setDisablePickup] = useState(true);
  const [disableDelivery, setDisableDelivery] = useState(true);
  const [pickupStartHour, setPickupStartHour] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const selectedEntry = selectedDate
    ? entryMap.get(dateToIso(selectedDate))
    : undefined;

  const upcomingEntries = useMemo(
    () =>
      entries.filter((entry) => {
        const entryDate = startOfDay(parseISO(entry.date));
        return !isBefore(entryDate, today);
      }),
    [entries, today],
  );

  const openEditor = (date: Date) => {
    if (isBefore(date, today)) return;
    setSelectedDate(date);
    const iso = dateToIso(date);
    const entry = entryMap.get(iso);
    if (entry) {
      setDisablePickup(entry.disable_pickup);
      setDisableDelivery(entry.disable_delivery);
      setPickupStartHour(
        entry.pickup_start_hour != null ? String(entry.pickup_start_hour) : "",
      );
      setNotes(entry.notes ?? "");
    } else {
      setDisablePickup(true);
      setDisableDelivery(true);
      setPickupStartHour("");
      setNotes("");
    }
    setMessage(null);
  };

  const handleSave = async () => {
    if (!selectedDate) return;
    const hourValue =
      pickupStartHour.trim() === "" ? null : Number(pickupStartHour);
    if (
      hourValue !== null &&
      (!Number.isInteger(hourValue) || hourValue < 0 || hourValue > 23)
    ) {
      setMessage("Earliest pickup hour must be between 0 and 23.");
      return;
    }
    if (!disablePickup && !disableDelivery && hourValue === null) {
      setMessage("Select at least one restriction or set an earliest pickup hour.");
      return;
    }

    try {
      await onSave({
        id: selectedEntry?.id,
        date: dateToIso(selectedDate),
        disable_pickup: disablePickup,
        disable_delivery: disableDelivery,
        pickup_start_hour: disablePickup ? null : hourValue,
        notes: notes.trim() || null,
      });
      setMessage("Saved.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to save.");
    }
  };

  const handleDelete = async () => {
    if (!selectedEntry) return;
    try {
      await onDelete(selectedEntry.id);
      setSelectedDate(undefined);
      setMessage("Removed.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to delete.");
    }
  };

  const modifiers = useMemo(() => {
    const both: Date[] = [];
    const delivery: Date[] = [];
    const partial: Date[] = [];

    for (const entry of entries) {
      const date = parseISO(entry.date);
      const kind = getDayKind(entry);
      if (kind === "both") both.push(date);
      else if (kind === "delivery") delivery.push(date);
      else if (kind === "partial") partial.push(date);
    }

    return { both, delivery, partial };
  }, [entries]);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
        <div className="flex flex-wrap gap-3 mb-4 text-xs text-gray-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-500" />
            Both blocked
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-orange-500" />
            Delivery only
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full border-2 border-amber-500 bg-amber-50" />
            Partial pickup
          </span>
        </div>

        <DayPicker
          mode="single"
          selected={selectedDate}
          onSelect={(date) => date && openEditor(date)}
          month={selectedDate ?? today}
          fromDate={today}
          toDate={maxDate}
          disabled={{ before: today, after: maxDate }}
          modifiers={modifiers}
          modifiersClassNames={{
            both: "rdp-day_both !bg-red-500 !text-white hover:!bg-red-600",
            delivery: "rdp-day_delivery !bg-orange-500 !text-white hover:!bg-orange-600",
            partial:
              "rdp-day_partial !border-2 !border-amber-500 !bg-amber-50 !text-amber-900",
            selected: "!ring-2 !ring-blue-600 !ring-offset-2",
            today: "font-bold underline",
          }}
          className="mx-auto"
        />
      </div>

      {selectedDate ? (
        <div className="rounded-lg border border-gray-200 p-4 space-y-4 bg-white shadow-sm">
          <div>
            <h3 className="font-semibold text-gray-900">
              {formatDisplayDate(dateToIso(selectedDate))}
            </h3>
            <p className="text-sm text-gray-500">
              Configure pickup and delivery restrictions for this date.
            </p>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={disablePickup}
                onChange={(e) => setDisablePickup(e.target.checked)}
                className="rounded border-gray-300"
              />
              Block pickup
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={disableDelivery}
                onChange={(e) => setDisableDelivery(e.target.checked)}
                className="rounded border-gray-300"
              />
              Block delivery
            </label>
          </div>

          {!disablePickup ? (
            <div className="space-y-1">
              <Label htmlFor="pickup-hour">Earliest pickup hour (0–23)</Label>
              <Input
                id="pickup-hour"
                type="number"
                min={0}
                max={23}
                placeholder="e.g. 12"
                value={pickupStartHour}
                onChange={(e) => setPickupStartHour(e.target.value)}
              />
            </div>
          ) : null}

          <div className="space-y-1">
            <Label htmlFor="notes">Notes (admin only)</Label>
            <Textarea
              id="notes"
              rows={2}
              placeholder="Optional note for staff"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {message ? (
            <p className="text-sm text-gray-600">{message}</p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
            {selectedEntry ? (
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={isSaving}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                Remove
              </Button>
            ) : null}
            <Button
              variant="ghost"
              onClick={() => setSelectedDate(undefined)}
              disabled={isSaving}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Upcoming blackout dates</h3>
        {upcomingEntries.length === 0 ? (
          <p className="text-sm text-gray-500">No upcoming blackout dates.</p>
        ) : (
          <ul className="space-y-2">
            {upcomingEntries.map((entry) => {
              const kind = getDayKind(entry);
              const badges =
                kind === "both"
                  ? ["Pickup", "Delivery"]
                  : kind === "delivery"
                    ? ["Delivery"]
                    : kind === "partial"
                      ? ["Partial"]
                      : [];
              return (
                <li
                  key={entry.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2"
                >
                  <button
                    type="button"
                    onClick={() => openEditor(parseISO(entry.date))}
                    className="flex-1 text-left"
                  >
                    <div className="font-medium text-gray-900">
                      {formatDisplayDate(entry.date)}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {badges.map((badge) => (
                        <span
                          key={badge}
                          className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600"
                        >
                          {badge}
                          {badge === "Partial" && entry.pickup_start_hour != null
                            ? ` from ${entry.pickup_start_hour}:00`
                            : ""}
                        </span>
                      ))}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(entry.id)}
                    className="p-2 text-gray-400 hover:text-red-600 rounded"
                    aria-label="Delete blackout date"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
