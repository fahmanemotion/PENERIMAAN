"use client";

import * as React from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Download, Landmark, CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import * as XLSX from "xlsx-js-style";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { SERVICE_MAP, MONTHS, YEARS, CUR_YEAR, CUR_MONTH } from "@/lib/constants";
import { TRX } from "@/data/mock";
import { rupiah } from "@/lib/format";
import { usePengesahan } from "@/lib/pengesahan-context";
import { rincianOf } from "@/lib/rincian";
import type { ServiceKey, Trx } from "@/types";

type Akun = { kode: string; nama: string; svcs: ServiceKey[] | null };
const AKUN: Akun[] = [
  { kode: "424111", nama: "Pendapatan Jasa Pelayanan Rumah Sakit", svcs: ["rs"] },
  { kode: "424112", nama: "Pendapatan Jasa Pelayanan Pendidikan", svcs: ["taruna", "penjenjangan", "teknis", "sipencatar", "pos"] },
  { kode: "424312", nama: "Pendapatan Hasil Kerja Sama Lembaga/Badan Usaha", svcs: ["kerjasama", "ticketing"] },
  { kode: "424911", nama: "Pendapatan Jasa Layanan Perbankan BLU", svcs: null },
  { kode: "424919", nama: "Pendapatan Lain-lain BLU", svcs: null },
  { kode: "424923", nama: "Pendapatan BLU Lainnya dari Sewa Ruangan", svcs: null },
  { kode: "424924", nama: "Pendapatan BLU Lainnya dari Sewa Peralatan dan Mesin", svcs: null },
];
const akunOf = (key: ServiceKey) => AKUN.find((a) => a.svcs?.includes(key))?.kode ?? "";
const pad = (n: number) => String(n).padStart(2, "0");
const tglStr = (t: Trx) => `${pad(t.day)}/${pad(t.m + 1)}/${t.y}`;
function atStartOfDay(d: Date): Date { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

type Item = { t: Trx; jenis: string; nominal: number; akun: string };

export function DisahkanAkun() {
  const { ratified } = usePengesahan();
  const [year, setYear] = React.useState<number>(CUR_YEAR);
  const [month, setMonth] = React.useState<number | "all">("all");
  const [range, setRange] = React.useState<DateRange | undefined>(undefined);
  const [akun, setAkun] = React.useState<string>("all");
  const [jenis, setJenis] = React.useState<string>("all");
  const [view, setView] = React.useState<"rekap" | "rincian">("rekap");

  React.useEffect(() => { setJenis("all"); }, [year, month, range]);

  const inP = React.useCallback((t: Trx) => {
    if (t.y !== year) return false;
    if (month !== "all") return t.m === month;
    if (range?.from) {
      const from = atStartOfDay(range.from); const to = atStartOfDay(range.to ?? range.from);
      const d = atStartOfDay(new Date(t.y, t.m, t.day));
      return d >= from && d <= to;
    }
    return true;
  }, [year, month, range]);

  const ratifiedTrx = React.useMemo(() => TRX.filter((t) => ratified.has(t.id)), [ratified]);
  const periodList = React.useMemo(() => ratifiedTrx.filter((t) => inP(t)), [ratifiedTrx, inP]);

  // urai tiap transaksi disahkan menjadi baris per jenis tagihan
  const allItems = React.useMemo(() => {
    const out: Item[] = [];
    for (const t of periodList) {
      const ak = akunOf(t.key);
      for (const it of rincianOf(t)) out.push({ t, jenis: it.jenis, nominal: it.nominal, akun: ak });
    }
    return out;
  }, [periodList]);

  const jenisOptions = React.useMemo(() => [...new Set(allItems.map((i) => i.jenis))].sort((a, b) => a.localeCompare(b)), [allItems]);
  const items = jenis === "all" ? allItems : allItems.filter((i) => i.jenis === jenis);

  const perAkunAll = React.useMemo(() => AKUN.map((a) => {
    const its = items.filter((i) => i.akun === a.kode).sort((x, y) => y.t.m - x.t.m || y.t.day - x.t.day);
    return { ...a, items: its, realisasi: its.reduce((s, i) => s + i.nominal, 0) };
  }), [items]);

  const perAkun = akun === "all" ? perAkunAll : perAkunAll.filter((a) => a.kode === akun);
  const total = perAkun.reduce((a, r) => a + r.realisasi, 0);

  const monthItems = MONTHS.map((mn, i) => ({ i, mn })).filter(({ i }) => !(year === CUR_YEAR && i > CUR_MONTH));
  const periodeLabel =
    month !== "all" ? `${MONTHS[month]} ${year}`
      : range?.from ? `${format(range.from, "d MMM yyyy", { locale: localeId })} – ${format(range.to ?? range.from, "d MMM yyyy", { locale: localeId })}`
        : `Sepanjang tahun ${year}`;
  const akunLabel = akun === "all" ? "Semua Akun" : akun;
  const jenisLabel = jenis === "all" ? "Semua Jenis" : jenis;

  const border = { top: { style: "thin", color: { rgb: "000000" } }, bottom: { style: "thin", color: { rgb: "000000" } }, left: { style: "thin", color: { rgb: "000000" } }, right: { style: "thin", color: { rgb: "000000" } } };
  const money = '"Rp"#,##0';
  const styleCells = (ws: Record<string, any>, r: number, cols: number, s: (c: number) => Record<string, unknown>) => {
    for (let c = 0; c < cols; c++) { const a = XLSX.utils.encode_cell({ r, c }); if (!ws[a]) ws[a] = { t: "s", v: "" }; ws[a].s = { ...(ws[a].s || {}), ...s(c) }; }
  };
  function saveWb(ws: Record<string, any>, name: string, file: string) {
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws as any, name);
    const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob); const el = document.createElement("a");
    el.href = url; el.download = file; document.body.appendChild(el); el.click(); document.body.removeChild(el); URL.revokeObjectURL(url);
  }
  function unduh() {
    const sub = `DISAHKAN · ${periodeLabel.toUpperCase()} · ${akunLabel.toUpperCase()} · ${jenisLabel.toUpperCase()}`;
    if (view === "rekap") {
      const aoa: (string | number)[][] = [["REKAP PENERIMAAN DISAHKAN PER AKUN — PIP MAKASSAR"], [sub], [], ["NO", "Uraian", "Realisasi"],
        ...perAkun.map((r, i) => [i + 1, `${r.kode} | ${r.nama}`, r.realisasi]), ["", "GRAND TOTAL", total]];
      const ws = XLSX.utils.aoa_to_sheet(aoa) as Record<string, any>;
      ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } }];
      ws["!cols"] = [{ wch: 5 }, { wch: 56 }, { wch: 20 }];
      const set = (r: number, c: number, s: Record<string, unknown>) => { const a = XLSX.utils.encode_cell({ r, c }); if (!ws[a]) ws[a] = { t: "s", v: "" }; ws[a].s = { ...(ws[a].s || {}), ...s }; };
      set(0, 0, { font: { bold: true, sz: 13 }, alignment: { horizontal: "center" } }); set(1, 0, { font: { bold: true, sz: 11 }, alignment: { horizontal: "center" } });
      styleCells(ws, 3, 3, () => ({ font: { bold: true }, fill: { patternType: "solid", fgColor: { rgb: "C6E0B4" } }, alignment: { horizontal: "center" }, border }));
      perAkun.forEach((_, i) => styleCells(ws, 4 + i, 3, (c) => ({ border, alignment: { horizontal: c === 0 ? "center" : c === 2 ? "right" : "left" }, ...(c === 2 ? { numFmt: money } : {}) })));
      styleCells(ws, 4 + perAkun.length, 3, (c) => ({ font: { bold: true }, fill: { patternType: "solid", fgColor: { rgb: "FCE4D6" } }, border, alignment: { horizontal: c === 1 ? "left" : c === 2 ? "right" : "center" }, ...(c === 2 ? { numFmt: money } : {}) }));
      saveWb(ws, "Disahkan Akun", "Rekap-Disahkan-Per-Akun.xlsx");
    } else {
      const aoa: (string | number)[][] = [["RINCIAN PENERIMAAN DISAHKAN PER AKUN — PIP MAKASSAR"], [sub], [], ["Tanggal", "Layanan", "Jenis Tagihan", "Pembayar", "Nominal"]];
      const kinds: string[] = ["", "", "", "head"];
      perAkun.forEach((a) => {
        aoa.push([`${a.kode} | ${a.nama}`, "", "", "", a.realisasi]); kinds.push("group");
        if (a.items.length) a.items.forEach((it) => { aoa.push([tglStr(it.t), SERVICE_MAP[it.t.key].name, it.jenis, it.t.payer + (it.t.prodi ? ` · ${it.t.prodi}` : ""), it.nominal]); kinds.push("item"); });
        else { aoa.push(["(tidak ada yang disahkan)", "", "", "", 0]); kinds.push("item"); }
      });
      aoa.push(["GRAND TOTAL", "", "", "", total]); kinds.push("total");
      const ws = XLSX.utils.aoa_to_sheet(aoa) as Record<string, any>;
      ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }];
      ws["!cols"] = [{ wch: 14 }, { wch: 20 }, { wch: 30 }, { wch: 28 }, { wch: 18 }];
      const set = (r: number, c: number, s: Record<string, unknown>) => { const a = XLSX.utils.encode_cell({ r, c }); if (!ws[a]) ws[a] = { t: "s", v: "" }; ws[a].s = { ...(ws[a].s || {}), ...s }; };
      set(0, 0, { font: { bold: true, sz: 13 }, alignment: { horizontal: "center" } }); set(1, 0, { font: { bold: true, sz: 11 }, alignment: { horizontal: "center" } });
      kinds.forEach((k, r) => {
        if (k === "head") styleCells(ws, r, 5, () => ({ font: { bold: true }, fill: { patternType: "solid", fgColor: { rgb: "C6E0B4" } }, alignment: { horizontal: "center" }, border }));
        if (k === "group") { ws["!merges"]!.push({ s: { r, c: 0 }, e: { r, c: 3 } }); styleCells(ws, r, 5, (c) => ({ font: { bold: true }, fill: { patternType: "solid", fgColor: { rgb: "D9E1F2" } }, border, alignment: { horizontal: c === 4 ? "right" : "left" }, ...(c === 4 ? { numFmt: money } : {}) })); }
        if (k === "item") styleCells(ws, r, 5, (c) => ({ border, alignment: { horizontal: c === 4 ? "right" : "left" }, ...(c === 4 ? { numFmt: money } : {}) }));
        if (k === "total") { ws["!merges"]!.push({ s: { r, c: 0 }, e: { r, c: 3 } }); styleCells(ws, r, 5, (c) => ({ font: { bold: true }, fill: { patternType: "solid", fgColor: { rgb: "FCE4D6" } }, border, alignment: { horizontal: c === 4 ? "right" : "left" }, ...(c === 4 ? { numFmt: money } : {}) })); }
      });
      saveWb(ws, "Rincian Disahkan", "Rincian-Disahkan-Per-Akun.xlsx");
    }
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold"><Landmark className="size-4" /> Rekap Penerimaan Disahkan per Akun</h3>
          <p className="text-xs text-muted-foreground">Realisasi yang sudah disahkan (424xxx) · {periodeLabel} · {akunLabel} · {jenisLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={view} onValueChange={(v) => setView(v as "rekap" | "rincian")}>
            <SelectTrigger className="w-32"><span>{view === "rekap" ? "Rekap" : "Rincian"}</span></SelectTrigger>
            <SelectContent>
              <SelectItem value="rekap">Rekap</SelectItem>
              <SelectItem value="rincian">Rincian</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={unduh}><Download className="mr-1.5 size-4" />Unduh Excel</Button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap items-end gap-3 border-b px-5 py-3">
        <Field label="Tahun">
          <Select value={String(year)} onValueChange={(v) => { setYear(Number(v ?? CUR_YEAR)); setMonth("all"); setRange(undefined); }}>
            <SelectTrigger className="w-28"><span>Tahun {year}</span></SelectTrigger>
            <SelectContent>{YEARS.map((y) => (<SelectItem key={y} value={String(y)}>Tahun {y}</SelectItem>))}</SelectContent>
          </Select>
        </Field>
        <Field label="Bulan">
          <Select value={month === "all" ? "all" : String(month + 1)} onValueChange={(v) => { setMonth(v === "all" || v === null ? "all" : Number(v) - 1); setRange(undefined); }}>
            <SelectTrigger className="w-28"><span>{month === "all" ? "Semua Bulan" : MONTHS[month]}</span></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Bulan</SelectItem>
              {monthItems.map(({ i, mn }) => (<SelectItem key={i} value={String(i + 1)}>{mn}</SelectItem>))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Rentang Tanggal">
          <Popover>
            <PopoverTrigger className={cn("flex h-9 w-56 items-center justify-start gap-2 rounded-md border border-input bg-background px-3 text-left text-sm font-normal shadow-sm transition-colors hover:bg-accent", !range?.from && "text-muted-foreground")}>
              <CalendarIcon className="size-4" />
              {range?.from ? (range.to ? (<>{format(range.from, "d MMM yyyy", { locale: localeId })} – {format(range.to, "d MMM yyyy", { locale: localeId })}</>) : (format(range.from, "d MMM yyyy", { locale: localeId }))) : (<span>Pilih tanggal</span>)}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="range" defaultMonth={range?.from ?? new Date(year, 0, 1)} selected={range} onSelect={(r) => { setRange(r); setMonth("all"); }} numberOfMonths={2} locale={localeId} />
            </PopoverContent>
          </Popover>
        </Field>
        <Field label="Akun">
          <Select value={akun} onValueChange={(v) => setAkun(v ?? "all")}>
            <SelectTrigger className="w-40"><span>{akun === "all" ? "Semua Akun" : akun}</span></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Akun</SelectItem>
              {AKUN.map((a) => (<SelectItem key={a.kode} value={a.kode}>{a.kode} — {a.nama.replace(/^Pendapatan\s+/i, "")}</SelectItem>))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Jenis Tagihan">
          <Select value={jenis} onValueChange={(v) => setJenis(v ?? "all")}>
            <SelectTrigger className="w-52"><span className="truncate">{jenis === "all" ? "Semua Jenis" : jenis}</span></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Jenis</SelectItem>
              {jenisOptions.map((j) => (<SelectItem key={j} value={j}>{j}</SelectItem>))}
            </SelectContent>
          </Select>
        </Field>
        <Button variant="outline" onClick={() => { setYear(CUR_YEAR); setMonth("all"); setRange(undefined); setAkun("all"); setJenis("all"); }}>Reset</Button>
      </div>

      {view === "rekap" ? (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">NO</TableHead>
                  <TableHead>Uraian</TableHead>
                  <TableHead className="text-right">Realisasi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {perAkun.length ? perAkun.map((r, i) => (
                  <TableRow key={r.kode}>
                    <TableCell className="text-center text-muted-foreground">{i + 1}</TableCell>
                    <TableCell>
                      <span className="font-mono text-xs font-semibold">{r.kode}</span>
                      <div className="text-xs text-muted-foreground">{r.nama}</div>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{rupiah(r.realisasi)}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={3} className="py-10 text-center text-muted-foreground">Tidak ada akun untuk filter ini.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between border-t bg-primary/10 px-5 py-3 text-sm">
            <span className="font-bold">GRAND TOTAL</span>
            <span className="font-extrabold tabular-nums">{rupiah(total)}</span>
          </div>
        </>
      ) : (
        <>
          <div className="space-y-3 p-4">
            {perAkun.map((a) => {
              const shown = a.items.slice(0, 150);
              return (
                <div key={a.kode} className="overflow-hidden rounded-lg border">
                  <div className="flex items-center justify-between gap-2 border-b bg-sky-50 px-4 py-2.5 dark:bg-sky-950/30">
                    <span className="inline-flex items-center gap-2 text-sm font-bold text-sky-800 dark:text-sky-300">
                      <span className="font-mono">{a.kode}</span> — {a.nama}
                    </span>
                    <span className="text-xs text-muted-foreground">{a.items.length} baris · <span className="font-semibold text-foreground">{rupiah(a.realisasi)}</span></span>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    <table className="w-full table-fixed text-sm">
                      <colgroup>
                        <col style={{ width: 100 }} />
                        <col style={{ width: 130 }} />
                        <col style={{ width: 190 }} />
                        <col />
                        <col style={{ width: 140 }} />
                      </colgroup>
                      <thead>
                        <tr className="text-xs text-muted-foreground">
                          <th className="sticky top-0 z-10 border-b bg-muted px-3 py-2 text-left font-medium">Tanggal</th>
                          <th className="sticky top-0 z-10 border-b bg-muted px-3 py-2 text-left font-medium">Layanan</th>
                          <th className="sticky top-0 z-10 border-b bg-muted px-3 py-2 text-left font-medium">Jenis Tagihan</th>
                          <th className="sticky top-0 z-10 border-b bg-muted px-3 py-2 text-left font-medium">Pembayar</th>
                          <th className="sticky top-0 z-10 border-b bg-muted px-3 py-2 text-right font-medium">Nominal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shown.length ? shown.map((it, i) => (
                          <tr key={`${it.t.id}-${i}`} className="border-b last:border-0 hover:bg-muted/40">
                            <td className="px-3 py-2 font-mono text-xs">{tglStr(it.t)}</td>
                            <td className="truncate px-3 py-2">{SERVICE_MAP[it.t.key].name}</td>
                            <td className="truncate px-3 py-2" title={it.jenis}>{it.jenis}</td>
                            <td className="truncate px-3 py-2" title={it.t.payer}>{it.t.payer}{it.t.prodi ? ` · ${it.t.prodi}` : ""}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{rupiah(it.nominal)}</td>
                          </tr>
                        )) : (
                          <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Tidak ada yang disahkan pada filter ini.</td></tr>
                        )}
                        {a.items.length > 150 && (
                          <tr><td colSpan={5} className="px-3 py-2 text-center text-xs text-muted-foreground">Menampilkan 150 dari {a.items.length} baris · unduhan memuat seluruhnya</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between border-t bg-primary/10 px-5 py-3 text-sm">
            <span className="font-bold">GRAND TOTAL</span>
            <span className="font-extrabold tabular-nums">{rupiah(total)}</span>
          </div>
        </>
      )}
    </Card>
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
