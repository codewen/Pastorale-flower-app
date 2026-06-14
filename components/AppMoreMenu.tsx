"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, CalendarOff, ClipboardList } from "lucide-react";

type MenuItem = {
  label: string;
  href: string;
  icon: typeof CalendarOff;
};

const BLACKOUT_ITEM: MenuItem = {
  label: "Blackout Dates",
  href: "/blackout-dates",
  icon: CalendarOff,
};

const ORDERS_ITEM: MenuItem = {
  label: "Orders",
  href: "/orders",
  icon: ClipboardList,
};

export function AppMoreMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const isBlackout =
    pathname === "/blackout-dates" ||
    pathname.startsWith("/blackout-dates/");

  const items = isBlackout ? [ORDERS_ITEM] : [BLACKOUT_ITEM];

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="p-2 -ml-2 hover:bg-gray-100 rounded"
        aria-label="More options"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Menu className="h-5 w-5 text-gray-700" />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute left-0 top-full mt-1 min-w-[11rem] rounded-lg border border-gray-200 bg-white shadow-lg py-1 z-30"
        >
          {items.map(({ label, href, icon: Icon }) => (
            <button
              key={href}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                router.push(href);
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left"
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
