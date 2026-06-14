import type { BlackoutDate, ThemeBlackoutPayload } from "@/types/blackout-date";

/** ISO date (YYYY-MM-DD) → storefront format (dd/mm/yyyy). */
export function isoToDisplay(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

/** Storefront format (dd/mm/yyyy) → ISO date (YYYY-MM-DD). */
export function displayToIso(display: string): string {
  const [day, month, year] = display.split("/");
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

export function toThemePayload(rows: BlackoutDate[]): ThemeBlackoutPayload {
  const datesDisabledPickUp: string[] = [];
  const datesDisabledDelivery: string[] = [];
  const pickupStartHourOverrides: Record<string, number> = {};

  for (const row of rows) {
    const formatted = isoToDisplay(row.date);
    if (row.disable_pickup) {
      datesDisabledPickUp.push(formatted);
    }
    if (row.disable_delivery) {
      datesDisabledDelivery.push(formatted);
    }
    if (
      row.pickup_start_hour != null &&
      !row.disable_pickup
    ) {
      pickupStartHourOverrides[formatted] = row.pickup_start_hour;
    }
  }

  return {
    datesDisabledPickUp,
    datesDisabledDelivery,
    pickupStartHourOverrides,
  };
}

export function formatDisplayDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
