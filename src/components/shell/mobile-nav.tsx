"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV } from "@/lib/nav";

export function MobileNav() {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => { setOpen(false); }, [pathname]);
  React.useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="Buka menu"
        onClick={() => setOpen(true)}
        className="grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:hidden"
      >
        <Menu className="size-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[82%] flex-col bg-gradient-to-b from-[#0a2540] via-[#0c2d48] to-[#08192f] text-slate-300 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-5">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-2xl bg-white/95 ring-1 ring-white/25">
                  <Image src="/logo-pip.png" alt="" width={40} height={36} className="size-7 object-contain" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-white">NAVI CAMPUS</p>
                  <p className="text-[11px] text-cyan-300/80">PIP Makassar</p>
                </div>
              </div>
              <button aria-label="Tutup menu" onClick={() => setOpen(false)} className="grid size-8 place-items-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white">
                <X className="size-5" />
              </button>
            </div>
            <div className="mx-5 mb-2 h-px bg-white/10" />
            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-4">
              {NAV.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
                      active ? "bg-white/10 text-white" : "text-slate-300/90 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    {active && <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-cyan-400" />}
                    <Icon className={cn("size-[18px] shrink-0", active ? "text-cyan-300" : "text-slate-400")} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
