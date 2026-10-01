"use client";

import { usePathname, useRouter } from "next/navigation";
import { UserRound, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shell/theme";
import { MobileNav } from "@/components/shell/mobile-nav";

const TITLES: Record<string, [string, string]> = {
  "/dashboard": ["Dashboard", "Ringkasan penerimaan seluruh layanan"],
  "/tagihan": ["Tagihan", "Daftar pembayaran taruna yang belum diselesaikan"],
  "/dana-kelola": ["Dana Kelola", "Rincian pendapatan yang belum disahkan"],
  "/pengesahan": ["Pengesahan", "Sahkan pendapatan masuk DIPA"],
  "/laporan": ["Laporan", "Rekap penerimaan dengan filter tahun, bulan, dan hari"],
  "/referensi": ["Referensi", "Kelola jenis tagihan dan tarif"],
  "/pengguna": ["Pengguna", "Kelola akun, peran, dan akses"],
};

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const key = Object.keys(TITLES).find((k) => pathname.startsWith(k)) ?? "/dashboard";
  const [title, sub] = TITLES[key];
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-card/70 px-4 py-2.5 backdrop-blur-md sm:px-6 sm:py-3">
      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-cyan-400/60 via-teal-400/30 to-transparent" />
      <MobileNav />
      <div className="min-w-0">
        <h1 className="truncate text-[15px] font-bold sm:text-base">{title}</h1>
        <p className="hidden truncate text-xs text-muted-foreground sm:block">{sub}</p>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Badge variant="secondary" className="hidden gap-1.5 border-cyan-500/20 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 sm:inline-flex"><UserRound className="size-3.5" />Admin Keuangan</Badge>
        <ThemeToggle />
        <Button variant="ghost" size="icon" className="size-9" title="Keluar" onClick={() => router.push("/login")}>
          <LogOut className="size-4" />
        </Button>
      </div>
    </header>
  );
}
