import { supabase } from "./client";
import type { BlackoutDate, BlackoutDateFormData } from "@/types/blackout-date";

export async function getBlackoutDates(): Promise<BlackoutDate[]> {
  const { data, error } = await supabase
    .from("blackout_dates")
    .select("*")
    .order("date", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch blackout dates: ${error.message}`);
  }

  return data as BlackoutDate[];
}

export async function createBlackoutDate(
  formData: BlackoutDateFormData,
): Promise<BlackoutDate> {
  const { data, error } = await supabase
    .from("blackout_dates")
    .insert({
      date: formData.date,
      disable_pickup: formData.disable_pickup,
      disable_delivery: formData.disable_delivery,
      pickup_start_hour: formData.pickup_start_hour,
      notes: formData.notes ?? null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create blackout date: ${error.message}`);
  }

  return data as BlackoutDate;
}

export async function updateBlackoutDate(
  id: string,
  formData: BlackoutDateFormData,
): Promise<BlackoutDate> {
  const { data, error } = await supabase
    .from("blackout_dates")
    .update({
      date: formData.date,
      disable_pickup: formData.disable_pickup,
      disable_delivery: formData.disable_delivery,
      pickup_start_hour: formData.pickup_start_hour,
      notes: formData.notes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update blackout date: ${error.message}`);
  }

  return data as BlackoutDate;
}

export async function deleteBlackoutDate(id: string): Promise<void> {
  const { error } = await supabase.from("blackout_dates").delete().eq("id", id);

  if (error) {
    throw new Error(`Failed to delete blackout date: ${error.message}`);
  }
}
