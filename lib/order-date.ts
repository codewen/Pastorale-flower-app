interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

interface ClockTime {
  hour: number;
  minute: number;
  second: number;
}

const sydneyFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Australia/Sydney",
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});

function parseCalendarDate(value: string, dayFirst: boolean): CalendarDate | null {
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const local = value.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (!iso && !local) return null;
  const year = Number(iso ? iso[1] : local![3]);
  const month = Number(iso ? iso[2] : local![dayFirst ? 2 : 1]);
  const day = Number(iso ? iso[3] : local![dayFirst ? 1 : 2]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return year >= 1000 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? { year, month, day } : null;
}

function parseClockTime(value: string): ClockTime | null {
  const match = value.trim().match(/^(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  const second = Number(match[3] ?? 0);
  const meridiem = match[4]?.toLowerCase();
  if (minute > 59 || second > 59 || (meridiem ? hour < 1 || hour > 12 : hour > 23)) return null;
  if (meridiem) hour = hour % 12 + (meridiem === "pm" ? 12 : 0);
  return { hour, minute, second };
}

function parseShopifyTimeRange(value: string): ClockTime | null {
  const times = value.trim().split(/\s*(?:-|–|—|\bto\b)\s*/i);
  if (times.length > 2 || times.some((time) => !parseClockTime(time))) return null;
  return parseClockTime(times[0]);
}

function sydneyWallClock(timestamp: number): number {
  const parts = sydneyFormatter.formatToParts(timestamp);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((item) => item.type === type)!.value);
  return Date.UTC(part("year"), part("month") - 1, part("day"), part("hour"), part("minute"), part("second"));
}

/** Resolve a Sydney wall-clock time without assuming a fixed UTC offset. */
function sydneyToUtc(date: CalendarDate, time: ClockTime): string | null {
  const wallClock = Date.UTC(date.year, date.month - 1, date.day, time.hour, time.minute, time.second);
  // Inspect both sides of a possible daylight-saving transition, then round-trip.
  // Nonexistent or ambiguous local times require correction instead of guessing.
  const dayMs = 24 * 60 * 60 * 1000;
  const offsets = new Set([-dayMs, 0, dayMs].map((delta) => {
    const probe = wallClock + delta;
    return sydneyWallClock(probe) - probe;
  }));
  const candidates = [...offsets].map((offset) => wallClock - offset)
    .filter((timestamp) => sydneyWallClock(timestamp) === wallClock);
  return candidates.length === 1 ? new Date(candidates[0]).toISOString() : null;
}

export function parseShopifyDeliveryDate(dateValue?: string, timeValue?: string): string | null {
  if (!dateValue?.trim() || !timeValue?.trim()) return null;
  const date = parseCalendarDate(dateValue.trim(), true);
  // A pickup window is represented by its start, as in the existing app.
  const time = parseShopifyTimeRange(timeValue);
  return date && time ? sydneyToUtc(date, time) : null;
}

/**
 * Delivery orders use the requested date and an operational default. Cart
 * pickup times are deliberately ignored here because checkout can change the
 * fulfilment method to delivery.
 */
export function parseShopifyDeliveryDateWithDefaultTime(dateValue?: string): string | null {
  if (!dateValue?.trim()) return null;
  const date = parseCalendarDate(dateValue.trim(), true);
  if (!date) return null;

  const weekday = new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
  const defaultHour = weekday >= 1 && weekday <= 5 ? 13 : weekday === 6 ? 11 : null;
  return defaultHour === null ? null : sydneyToUtc(date, { hour: defaultHour, minute: 0, second: 0 });
}

/** Existing AppSheet CSV dates use month/day/year, with an explicit time. */
export function parseCsvDeliveryDate(value: string): string {
  const match = value.trim().match(/^(\S+)\s+(.+)$/);
  const date = match ? parseCalendarDate(match[1], false) : null;
  const time = match ? parseClockTime(match[2]) : null;
  const timestamp = date && time ? sydneyToUtc(date, time) : null;
  if (!timestamp) throw new Error(`Missing, invalid or ambiguous Sydney delivery date/time: "${value}"`);
  return timestamp;
}

export function hasDeliveryDateTime(value: string | null): value is string {
  return Boolean(value && Number.isFinite(Date.parse(value)));
}

export function sydneyDateTimeInput(value: string | null): string {
  return hasDeliveryDateTime(value)
    ? new Date(sydneyWallClock(Date.parse(value))).toISOString().slice(0, 16)
    : "";
}
