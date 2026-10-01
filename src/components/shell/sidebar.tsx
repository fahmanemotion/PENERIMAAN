"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV } from "@/lib/nav";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <aside className="relative hidden w-64 shrink-0 flex-col overflow-hidden bg-gradient-to-b from-[#0a2540] via-[#0c2d48] to-[#08192f] text-slate-300 lg:flex">
      {/* ombak dekoratif bawah */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 opacity-50">
        <svg viewBox="0 0 260 90" className="w-full" preserveAspectRatio="none" aria-hidden="true">
          <path fill="#0f6e56" fillOpacity="0.45" d="M0,45 C55,65 110,25 165,45 C215,63 245,32 260,48 L260,90 L0,90 Z" />
          <path fill="#22d3ee" fillOpacity="0.18" d="M0,60 C70,45 150,72 220,52 C245,45 255,60 260,55 L260,90 L0,90 Z" />
        </svg>
      </div>

      {/* brand */}
      <div className="relative flex items-center gap-3 px-5 py-5">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/95 shadow-lg ring-1 ring-white/25">
          <Image src="/logo-pip.png" alt="NAVI CAMPUS" width={44} height={40} className="size-8 object-contain" priority />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-extrabold tracking-tight text-white">NAVI CAMPUS</p>
          <p className="truncate text-[11px] text-cyan-300/80">Portal Keuangan Pelayaran</p>
        </div>
      </div>

      <div className="mx-5 mb-2 h-px bg-gradient-to-r from-cyan-400/50 via-white/10 to-transparent" />

      {/* navigasi */}
      <nav className="relative flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-3">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-white/10 text-white shadow-sm ring-1 ring-cyan-400/20" : "text-slate-300/90 hover:bg-white/5 hover:text-white",
              )}
            >
              {active && <span className="absolute inset-y-1.5 left-0 w-1 rounded-r-full bg-gradient-to-b from-cyan-400 to-teal-400" />}
              <Icon className={cn("size-[18px] shrink-0 transition-colors", active ? "text-cyan-300" : "text-slate-400 group-hover:text-cyan-200")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* keluar */}
      <div className="relative border-t border-white/10 p-3">
        <button
          onClick={() => router.push("/login")}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-rose-500/15 hover:text-rose-200"
        >
          <LogOut className="size-[18px] text-slate-400" />
          Keluar
        </button>
        <p className="mt-2 px-3 text-[11px] text-slate-500">Prototipe internal · data contoh</p>
      </div>
    </aside>
  );
}
