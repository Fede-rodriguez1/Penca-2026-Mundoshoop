// DEV ONLY — eliminar antes de producción
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const pages = [
  { label: "Login", href: "/login" },
  { label: "Registro", href: "/register" },
  { label: "Home", href: "/dashboard" },
];

export default function DevNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-24 lg:bottom-6 right-4 z-[100] flex flex-col items-end gap-2">
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mr-1">Dev</span>
      <div className="flex gap-1.5 bg-white border border-gray-200 rounded-2xl px-3 py-2 shadow-lg">
        {pages.map((page) => {
          const active = pathname === page.href;
          return (
            <Link
              key={page.href}
              href={page.href}
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition-colors"
              style={
                active
                  ? { backgroundColor: "#00217E", color: "white" }
                  : { color: "#6b7280", backgroundColor: "#f9fafb" }
              }
            >
              {page.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
