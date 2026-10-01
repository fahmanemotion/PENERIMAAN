"use client";

import * as React from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  CalendarIcon,
  GraduationCap,
  Award,
  Wrench,
  Stethoscope,
  Handshake,
  Clock,
  ClipboardCheck,
  Ticket,
  ScrollText,
  type LucideIcon,
} from "lucide-react";
import type { DateRange } from "react-day-picker";
import {
  Line,
  LineChart,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  Pie,
  PieChart,
  Cell,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { SERVICES, SERVICE_MAP, MONTHS, YEARS, CUR_YEAR, CUR_MONTH } from "@/lib/constants";
import { TRX, TAGIHAN } from "@/data/mock";
import { sumByService } from "@/lib/selectors";
import { rupiah, rupiahShort } from "@/lib/format";
import { rincianOf } from "@/lib/rincian";
import type { Trx, ServiceKey } from "@/types";

const SERVICE_ICONS: Record<ServiceKey, LucideIcon> = {
  taruna: GraduationCap,
  penjenjangan: Award,
  teknis: Wrench,
  rs: Stethoscope,
  kerjasama: Handshake,
  sipencatar: ClipboardCheck,
  ticketing: Ticket,
  pos: ScrollText,
};

function atStartOfDay(d: Date): Date { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

const PIE_PALETTE = ["#12599e", "#0891b2", "#0f766e", "#0d9488", "#0284c7", "#4f46e5", "#7c3aed", "#b45309", "#be123c", "#65a30d", "#c026d3", "#0369a1"];

export function DashboardView() {
  const [year, setYear] = React.useState<number>(CUR_YEAR);
  const [month, setMonth] = React.useState<number | "all">("all");
  const [range, setRange] = React.useState<DateRange | undefined>(undefined);
  const [svc, setSvc] = React.useState<ServiceKey | "all">("all");

  const list = React.useMemo<Trx[]>(() => {
    let out = TRX.filter((t) => t.y === year);
    if (month !== "all") {
      out = out.filter((t) => t.m === month);
    } else if (range?.from) {
      const from = atStartOfDay(range.from);
      const to = atStartOfDay(range.to ?? range.from);
      out = out.filter((t) => {
        const d = atStartOfDay(new Date(t.y, t.m, t.day));
        return d >= from && d <= to;
      });
    }
    return out;
  }, [year, month, range]);

  const by = React.useMemo(() => sumByService(list), [list]);
  const total = Object.values(by).reduce((a, b) => a + b, 0);
  const activeDays = new Set(list.map((t) => `${t.y}-${t.m}-${t.day}`)).size;
  const avgDaily = activeDays ? total / activeDays : 0;

  // Piutang tagihan taruna (belum dibayar) — kondisi saat ini.
  const unpaid = React.useMemo(() => TAGIHAN.filter((t) => !t.lunas), []);
  const piutangTotal = unpaid.reduce((a, t) => a + t.nominal, 0);
  const piutangCount = unpaid.length;
  const piutangTaruna = new Set(unpaid.map((t) => t.nit)).size;

  const chartList = React.useMemo(() => (svc === "all" ? list : list.filter((t) => t.key === svc)), [list, svc]);
  const chartData = React.useMemo(() => {
    const lastM = year === CUR_YEAR ? CUR_MONTH : 11; // garis berhenti di bulan berjalan
    return MONTHS.map((label, m) => ({
      label,
      value: m <= lastM ? chartList.filter((t) => t.m === m).reduce((a, t) => a + t.amount, 0) : null,
    }));
  }, [chartList, year]);

  // Data komposisi pendapatan per layanan (untuk donut).
  const pieData = React.useMemo(() => {
    if (svc === "all") return SERVICES.map((s) => ({ name: s.name, value: by[s.key], color: s.color })).filter((d) => d.value > 0);
    const map = new Map<string, number>();
    for (const t of chartList) for (const it of rincianOf(t)) map.set(it.jenis, (map.get(it.jenis) ?? 0) + it.nominal);
    return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([name, value], i) => ({ name, value, color: PIE_PALETTE[i % PIE_PALETTE.length] }));
  }, [svc, by, chartList]);
  const pieTotal = pieData.reduce((a, d) => a + d.value, 0);
  const svcLabel = svc === "all" ? "Semua Layanan" : SERVICE_MAP[svc].name;

  const rekapServices = svc === "all" ? SERVICES : SERVICES.filter((s) => s.key === svc);
  const rekapTotal = rekapServices.reduce((a, s) => a + by[s.key], 0);

  const monthItems = MONTHS.map((mn, i) => ({ i, mn })).filter(({ i }) => !(year === CUR_YEAR && i > CUR_MONTH));
  const periodeLabel =
    month !== "all"
      ? `${MONTHS[month]} ${year}`
      : range?.from
        ? `${format(range.from, "d MMM yyyy", { locale: localeId })} – ${format(range.to ?? range.from, "d MMM yyyy", { locale: localeId })}`
        : `Sepanjang tahun ${year}`;

  return (
    <div className="space-y-5">
      {/* Total (hero) */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-sky-800 via-sky-700 to-sky-600 p-6 text-white shadow-lg">
        <div className="pointer-events-none absolute -right-8 -top-10 size-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider opacity-85">Total Pendapatan Seluruh Layanan</p>
            <p className="mt-1 text-4xl font-extrabold tracking-tight tabular-nums">{rupiah(total)}</p>
            <p className="mt-1 text-sm opacity-90">{periodeLabel} · {list.length} transaksi</p>
          </div>
          <div className="rounded-2xl border border-white/25 bg-white/15 px-4 py-2 text-sm backdrop-blur-sm">
            <p className="opacity-90">Rata-rata Transaksi Harian</p>
            <p className="text-base font-bold tabular-nums">{rupiahShort(avgDaily)}</p>
          </div>
        </div>
      </Card>

      {/* Piutang tagihan taruna */}
      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-xl bg-rose-600/15 text-rose-600">
              <Clock className="size-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Piutang Tagihan Taruna (belum dibayar)</p>
              <p className="text-2xl font-extrabold tabular-nums text-rose-600">{rupiah(piutangTotal)}</p>
            </div>
          </div>
          <div className="flex gap-8 pr-2">
            <div>
              <p className="text-xs text-muted-foreground">Tagihan Belum Bayar</p>
              <p className="text-lg font-bold tabular-nums">{piutangCount}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Taruna Menunggak</p>
              <p className="text-lg font-bold tabular-nums">{piutangTaruna}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* 5 kartu layanan */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {SERVICES.map((s) => {
          const v = by[s.key];
          const pct = total ? (v / total) * 100 : 0;
          const Icon = SERVICE_ICONS[s.key];
          return (
            <Card key={s.key} className="relative overflow-hidden p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-md">
              <span className="absolute inset-x-0 top-0 h-1" style={{ background: s.color }} />
              <div className="flex items-center justify-between">
                <div className="grid size-9 place-items-center rounded-lg" style={{ background: `${s.color}22`, color: s.color }}>
                  <Icon className="size-4" />
                </div>
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">{pct.toFixed(1)}%</span>
              </div>
              <p className="mt-2.5 truncate text-[11px] font-medium text-muted-foreground" title={s.name}>{s.name}</p>
              <p className="mt-0.5 text-lg font-extrabold tracking-tight tabular-nums">{rupiahShort(v)}</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(3, pct)}%`, background: s.color }} />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Filter */}
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Tahun Anggaran">
          <Select value={String(year)} onValueChange={(v) => { setYear(Number(v)); setMonth("all"); setRange(undefined); }}>
            <SelectTrigger className="w-36"><span>Tahun {year}</span></SelectTrigger>
            <SelectContent>{YEARS.map((y) => (<SelectItem key={y} value={String(y)}>Tahun {y}</SelectItem>))}</SelectContent>
          </Select>
        </Field>
        <Field label="Bulan">
          <Select value={month === "all" ? "all" : String(month + 1)} onValueChange={(v) => { setMonth(v === "all" ? "all" : Number(v) - 1); setRange(undefined); }}>
            <SelectTrigger className="w-36"><span>{month === "all" ? "Semua Bulan" : MONTHS[month]}</span></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Bulan</SelectItem>
              {monthItems.map(({ i, mn }) => (<SelectItem key={i} value={String(i + 1)}>{mn}</SelectItem>))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Rentang Tanggal">
          <Popover>
            <PopoverTrigger className={cn("flex h-9 w-64 items-center justify-start gap-2 rounded-md border border-input bg-background px-3 text-left text-sm font-normal shadow-sm transition-colors hover:bg-accent", !range?.from && "text-muted-foreground")}>
              <CalendarIcon className="size-4" />
              {range?.from ? (range.to ? (<>{format(range.from, "d MMM yyyy", { locale: localeId })} – {format(range.to, "d MMM yyyy", { locale: localeId })}</>) : (format(range.from, "d MMM yyyy", { locale: localeId }))) : (<span>Pilih tanggal awal &amp; akhir</span>)}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="range" defaultMonth={range?.from ?? new Date(year, 0, 1)} selected={range} onSelect={(r) => { setRange(r); setMonth("all"); }} numberOfMonths={2} locale={localeId} />
            </PopoverContent>
          </Popover>
        </Field>
        <Field label="Layanan (untuk rekap)">
          <Select value={svc} onValueChange={(v) => setSvc(v as ServiceKey | "all")}>
            <SelectTrigger className="w-52"><span>{svc === "all" ? "Semua Layanan" : SERVICES.find((s) => s.key === svc)?.name}</span></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Layanan</SelectItem>
              {SERVICES.map((s) => (<SelectItem key={s.key} value={s.key}>{s.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </Field>
        <Button variant="outline" onClick={() => { setYear(CUR_YEAR); setMonth("all"); setRange(undefined); setSvc("all"); }}>Reset</Button>
      </div>

      {/* Chart: tren (bar) + komposisi (donut) */}
      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="overflow-hidden p-0 lg:col-span-2">
          <div className="border-b px-5 py-4">
            <h3 className="text-sm font-bold">Tren Penerimaan</h3>
            <p className="text-xs text-muted-foreground">Total per bulan · {svcLabel} · {periodeLabel}</p>
          </div>
          <div className="p-4">
            {pieTotal > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData} margin={{ top: 16, right: 16, left: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#1e88c7" />
                      <stop offset="100%" stopColor="#0f6e56" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <YAxis tickLine={false} axisLine={false} width={52} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickFormatter={(v) => rupiahShort(Number(v))} />
                  <Tooltip formatter={(value) => rupiah(Number(value))} cursor={{ stroke: "var(--accent)", strokeWidth: 1 }}
                    contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", background: "var(--popover)", color: "var(--popover-foreground)", fontSize: 12 }} />
                  <Line type="monotone" dataKey="value" stroke="url(#lineGrad)" strokeWidth={2.5} dot={{ r: 3, fill: "#12599e", strokeWidth: 0 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="py-10 text-center text-sm text-muted-foreground">Tidak ada data pada periode ini.</div>
            )}
          </div>
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="border-b px-5 py-4">
            <h3 className="text-sm font-bold">Komposisi Pendapatan</h3>
            <p className="text-xs text-muted-foreground">{svc === "all" ? "Porsi tiap layanan" : `Porsi jenis tagihan · ${svcLabel}`} · {periodeLabel}</p>
          </div>
          <div className="p-4">
            {pieTotal > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={2} strokeWidth={2} stroke="var(--card)">
                      {pieData.map((d, i) => (<Cell key={i} fill={d.color} />))}
                    </Pie>
                    <Tooltip formatter={(value) => rupiah(Number(value))}
                      contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", background: "var(--popover)", color: "var(--popover-foreground)", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-3 space-y-1.5">
                  {pieData.map((d) => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-2">
                        <span className="size-2.5 rounded-full" style={{ background: d.color }} />
                        {d.name}
                      </span>
                      <span className="font-semibold tabular-nums">{((d.value / pieTotal) * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="py-10 text-center text-sm text-muted-foreground">Tidak ada data pada periode ini.</div>
            )}
          </div>
        </Card>
      </div>

      {/* Rekap per layanan */}
      <Card className="overflow-hidden p-0">
        <div className="border-b px-5 py-4">
          <h3 className="text-sm font-bold">Rekapitulasi Pendapatan</h3>
          <p className="text-xs text-muted-foreground">
            {periodeLabel}{svc !== "all" ? ` · ${SERVICES.find((s) => s.key === svc)?.name}` : " · Semua Layanan"}
          </p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Layanan</TableHead>
                <TableHead className="text-right">Jumlah Transaksi</TableHead>
                <TableHead className="text-right">Total Pendapatan</TableHead>
                <TableHead className="text-right">Porsi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rekapServices.map((s) => {
                const v = by[s.key];
                const jml = list.filter((t) => t.key === s.key).length;
                const pct = rekapTotal ? (v / rekapTotal) * 100 : 0;
                const Icon = SERVICE_ICONS[s.key];
                return (
                  <TableRow key={s.key}>
                    <TableCell>
                      <span className="inline-flex items-center gap-2.5">
                        <span className="grid size-7 place-items-center rounded-lg" style={{ background: `${s.color}22`, color: s.color }}>
                          <Icon className="size-4" />
                        </span>
                        {s.name}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{jml}</TableCell>
                    <TableCell className="text-right tabular-nums">{rupiah(v)}</TableCell>
                    <TableCell className="text-right tabular-nums">{pct.toFixed(1)}%</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between border-t bg-muted/40 px-5 py-3 text-sm">
          <span className="font-semibold">{svc === "all" ? "Total Keseluruhan" : "Total"}</span>
          <span className="font-bold tabular-nums">{rupiah(rekapTotal)}</span>
        </div>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
