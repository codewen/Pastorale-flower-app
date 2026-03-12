import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  const hours24 = d.getHours();
  const hours12 = hours24 % 12 || 12;
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const period = hours24 >= 12 ? "PM" : "AM";

  return `${day}/${month}/${year} ${hours12}:${minutes} ${period}`;
}

export function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return "";
  return `$${amount.toFixed(2)}`;
}
