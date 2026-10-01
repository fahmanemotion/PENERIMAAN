"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { LayoutDashboard, FileText, UserRound, Menu, X, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/shell/theme";
import { getCurrentNit, resolveTaruna, CURRENT_TARUNA_KEY } from "@/lib/taruna";

const NAV = [
  { href: "/taruna/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/taruna/tagihan", label: "Tagihan", icon: FileText },
  { href: "/taruna/profil", label: "Profil", icon: UserRound },
];
const TITLES: Record<string, [string, string]> = {
  "/taruna/dashboard": ["Dashboard", "Informasi & pengumuman keuangan"],
  "/taruna/tagihan": ["Tagihan", "Seluruh tagihan selama pendidikan"],
  "/taruna/profil": ["Profil", "Data akun taruna"],
};

export function TarunaShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [nama, setNama] = React.useState("Taruna");

  React.useEffect(() => { setNama(resolveTaruna(getCurrentNit()).nama); }, []);
  React.useEffect(() => { setOpen(false); }, [pathname]);
  React.useEffect(() => { if (!open) return; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = ""; }; }, [open]);

  const key = Object.keys(TITLES).find((k) => pathname.startsWith(k)) ?? "/taruna/dashboard";
  const [title, sub] = TITLES[key];

  function logout() { try { localStorage.removeItem(CURRENT_TARUNA_KEY); } catch { /* ignore */ } router.push("/login"); }

  const navLinks = NAV.map((item) => {
    const active = pathname.startsWith(item.href);
    const Icon = item.icon;
    return (
      <Link key={item.href} href={item.href}
        className={cn("group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
          active ? "bg-white/10 text-white" : "text-slate-300/90 hover:bg-white/5 hover:text-white")}>
        {active && <span className="absolute inset-y-1.5 left-0 w-1 rounded-r-full bg-cyan-400" />}
        <Icon className={cn("size-[18px] shrink-0", active ? "text-cyan-300" : "text-slate-400 group-hover:text-cyan-200")} />
        {item.label}
      </Link>
    );
  });

  const brand = (
    <div className="flex items-center gap-3 px-5 py-5">
      <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/95 shadow-lg ring-1 ring-white/25">
        <Image src="/logo-pip.png" alt="NAVI CAMPUS" width={44} height={40} className="size-8 object-contain" priority />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[15px] font-extrabold tracking-tight text-white">NAVI CAMPUS</p>
        <p className="truncate text-[11px] text-cyan-300/80">Portal Taruna · PIP Makassar</p>
      </div>
    </div>
  );
  const logoutBtn = (
    <button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white">
      <LogOut className="size-[18px] text-slate-400" />Keluar
    </button>
  );

  return (
    <div className="flex min-h-dvh bg-gradient-to-br from-slate-100 via-slate-50 to-sky-100/50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <aside className="hidden w-64 shrink-0 flex-col bg-gradient-to-b from-[#0a2540] via-[#0c2d48] to-[#08192f] text-slate-300 lg:flex">
        {brand}
        <div className="mx-5 mb-2 h-px bg-white/10" />
        <nav className="flex flex-1 flex-col gap-1 px-3 pb-3">{navLinks}</nav>
        <div className="border-t border-white/10 p-3">{logoutBtn}</div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-card/80 px-4 py-2.5 backdrop-blur-md sm:px-6 sm:py-3">
          <button aria-label="Buka menu" onClick={() => setOpen(true)} className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"><Menu className="size-5" /></button>
          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-bold sm:text-base">{title}</h1>
            <p className="hidden truncate text-xs text-muted-foreground sm:block">{sub}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden max-w-[160px] truncate text-sm font-medium sm:inline-block">{nama}</span>
            <ThemeToggle />
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1100px] flex-1 p-4 sm:p-5 lg:p-6">{children}</main>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[82%] flex-col bg-gradient-to-b from-[#0a2540] via-[#0c2d48] to-[#08192f] text-slate-300 shadow-2xl">
            <div className="flex items-center justify-between pr-3">{brand}<button aria-label="Tutup menu" onClick={() => setOpen(false)} className="grid size-8 place-items-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white"><X className="size-5" /></button></div>
            <div className="mx-5 mb-2 h-px bg-white/10" />
            <nav className="flex flex-1 flex-col gap-1 px-3 pb-4">{navLinks}</nav>
            <div className="border-t border-white/10 p-3">{logoutBtn}</div>
          </aside>
        </div>
      )}
    </div>
  );
}
