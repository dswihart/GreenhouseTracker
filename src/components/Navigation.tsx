"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/plants", label: "Plants", icon: "🌱" },
  { href: "/zones", label: "Zones", icon: "🗺️" },
  { href: "/doctor", label: "Doctor", icon: "🩺" },
  { href: "/calendar", label: "Calendar", icon: "📅" },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t-2 border-slate-600 px-2 py-2 z-50"
      role="navigation"
      aria-label="Main navigation"
    >
      <ul className="flex justify-around items-center max-w-xl mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex flex-col items-center px-4 py-3 rounded-xl transition-colors min-w-[64px] ${
                  isActive
                    ? "text-green-300 bg-slate-700 font-bold"
                    : "text-slate-300 hover:text-white hover:bg-slate-800"
                }`}
              >
                {/* Larger icon for better visibility */}
                <span className="text-3xl" aria-hidden="true">{item.icon}</span>
                {/* Larger, bolder text label */}
                <span className="text-sm mt-1 font-medium">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
