"use client";

import * as React from "react";
import { Wallet, CheckCircle2, Clock, Megaphone, CreditCard } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getCurrentNit, resolveTaruna, buildBills, type TarunaProfile } from "@/lib/taruna";
import { rupiah } from "@/lib/format";

const PENGUMUMAN = [
  { judul: "Batas Pembayaran SPP Semester Ganjil", isi: "Pembayaran SPP semester ganjil T.A. 2026/2027 paling lambat 30 September 2026. Mohon segera diselesaikan agar tidak terkendala administrasi.", tgl: "5 September 2026" },
  { judul: "Tagihan Praktik Laut Telah Terbit", isi: "Tagihan biaya praktik laut untuk taruna semester ganjil telah diterbitkan dan dapat dilihat pada menu Tagihan.", tgl: "1 September 2026" },
  { judul: "Metode Pembayaran", isi: "Seluruh pembayaran dilakukan melalui Virtual Account BNI sesuai NIT masing-masing. Simpan bukti pembayaran Anda.", tgl: "28 Agustus 2026" },
];

export function TarunaDashboard() {
  const [profile, setProfile] = React.useState<TarunaProfile | null>(null);
  const [stat, setStat] = React.useState({ total: 0, lunas: 0, belum: 0, belumCount: 0 });

  React.useEffect(() => {
    const p = resolveTaruna(getCurrentNit());
    setProfile(p);
    const bills = buildBills(p);
    const total = bills.reduce((a, b) => a + b.nominal, 0);
    const lunas = bills.filter((b) => b.lunas).reduce((a, b) => a + b.nominal, 0);
    const belumBills = bills.filter((b) => !b.lunas);
    setStat({ total, lunas, belum: belumBills.reduce((a, b) => a + b.nominal, 0), belumCount: belumBills.length });
  }, []);

  return (
    <div className="space-y-5">
      {/* Sambutan */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-sky-800 via-sky-700 to-sky-600 p-6 text-white shadow-lg">
        <div className="pointer-events-none absolute -right-8 -top-10 size-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-wider opacity-85">Selamat datang</p>
          <p className="mt-1 text-2xl font-extrabold tracking-tight">{profile?.nama ?? "Taruna"}</p>
          <p className="mt-1 text-sm opacity-90">{profile?.nit} · {profile?.prodi} · Semester {profile?.sem}</p>
        </div>
      </Card>

      {/* Ringkasan tagihan */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat color="#12599e" Icon={Wallet} title="Total Tagihan" value={rupiah(stat.total)} sub="selama pendidikan" />
        <Stat color="#059669" Icon={CheckCircle2} title="Sudah Lunas" value={rupiah(stat.lunas)} sub="terbayar" valueClass="text-emerald-600" />
        <Stat color="#e11d48" Icon={Clock} title="Belum Dibayar" value={rupiah(stat.belum)} sub={`${stat.belumCount} tagihan`} valueClass="text-rose-600" />
      </div>

      {stat.belumCount > 0 && (
        <Card className="flex items-center gap-3 border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
          <CreditCard className="size-5 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Anda memiliki <b>{stat.belumCount} tagihan</b> yang belum dibayar senilai <b>{rupiah(stat.belum)}</b>. Silakan cek menu <b>Tagihan</b>.
          </p>
        </Card>
      )}

      {/* Pengumuman */}
      <Card className="overflow-hidden p-0">
        <div className="flex items-center gap-2 border-b px-5 py-4">
          <Megaphone className="size-4" />
          <div>
            <h3 className="text-sm font-bold">Pengumuman</h3>
            <p className="text-xs text-muted-foreground">Informasi dari Bagian Keuangan PIP Makassar</p>
          </div>
        </div>
        <div className="divide-y">
          {PENGUMUMAN.map((p, i) => (
            <div key={i} className="px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">{p.judul}</p>
                <span className="shrink-0 text-[11px] text-muted-foreground">{p.tgl}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{p.isi}</p>
              <p className="mt-1.5 text-[11px] font-medium text-sky-700">— Bagian Keuangan</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Stat({ color, Icon, title, value, sub, valueClass }: { color: string; Icon: React.ComponentType<{ className?: string }>; title: string; value: string; sub: string; valueClass?: string }) {
  return (
    <Card className="relative overflow-hidden p-5">
      <span className="absolute inset-x-0 top-0 h-1" style={{ background: color }} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className={`mt-1 text-xl font-extrabold tabular-nums ${valueClass ?? ""}`}>{value}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
        </div>
        <div className="grid size-11 place-items-center rounded-xl" style={{ background: `${color}22`, color }}><Icon className="size-5" /></div>
      </div>
    </Card>
  );
}
