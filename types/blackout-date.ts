export type BlackoutDate = {
  id: string;
  date: string;
  disable_pickup: boolean;
  disable_delivery: boolean;
  pickup_start_hour: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type BlackoutDateFormData = {
  date: string;
  disable_pickup: boolean;
  disable_delivery: boolean;
  pickup_start_hour: number | null;
  notes?: string | null;
};

export type ThemeBlackoutPayload = {
  datesDisabledPickUp: string[];
  datesDisabledDelivery: string[];
  pickupStartHourOverrides: Record<string, number>;
};

export type BlackoutDayKind = "both" | "delivery" | "partial" | "none";
