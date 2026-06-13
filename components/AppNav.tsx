"use client";

import { useRouter, usePathname } from "next/navigation";
import { ClipboardList, CalendarOff } from "lucide-react";

const APP_TABS = [
  { label: "Orders", href: "/orders", icon: ClipboardList },
  { label: "Blackout Dates", href: "/blackout-dates", icon: CalendarOff },
] as const;

export function AppNav() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <nav className="border-t border-gray-200 bg-white">
      <div className="flex items-center justify-around p-3">
        {APP_TABS.map(({ label, href, icon: Icon }) => {
          const isActive =
            pathname === href || pathname.startsWith(`${href}/`);
          return (
            <button
              key={href}
              type="button"
              onClick={() => router.push(href)}
              className={`flex flex-col items-center gap-1 min-w-[80px] ${
                isActive ? "text-blue-600" : "text-gray-500"
              }`}
            >
              <div className="h-5 w-5 flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium text-center">{label}</span>
              {isActive ? <div className="h-0.5 w-8 bg-blue-600" /> : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
