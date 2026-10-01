"use client";

import * as React from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Pencil, Download, Landmark, CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import * as XLSX from "xlsx-js-style";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { SERVICE_MAP, MONTHS, YEARS, CUR_YEAR, CUR_MONTH } from "@/lib/constants";
import { TRX } from "@/data/mock";
import { rupiah } from "@/lib/format";
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
const STORE_KEY = "portal-akun-manual-v2"; // kode -> realisasi manual
const pad = (n: number) => String(n).padStart(2, "0");
const tglStr = (t: Trx) => `${pad(t.day)}/${pad(t.m + 1)}/${t.y}`;
function atStartOfDay(d: Date): Date { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

export function AkunRekap() {
  const [year, setYear] = React.useState<number>(CUR_YEAR);
  const [month, setMonth] = React.useState<number | "all">("all");
  const [range, setRange] = React.useState<DateRange | undefined>(undefined);
  const [akun, setAkun] = React.useState<string>("all");
  const [manual, setManual] = React.useState<Record<string, number>>({});
  const [edit, setEdit] = React.useState<Akun | null>(null);
  const [formVal, setFormVal] = React.useState<number>(0);
  const [view, setView] = React.useState<"rekap" | "rincian">("rekap");

  React.useEffect(() => {
    try { const raw = localStorage.getItem(STORE_KEY); if (raw) setManual(JSON.parse(raw)); } catch { /* ignore */ }
  }, []);

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

  const periodList = React.useMemo(() => TRX.filter(inP), [inP]);

  const perAkunAll = React.useMemo(() => AKUN.map((a) => {
    const txs = a.svcs ? periodList.filter((t) => a.svcs!.includes(t.key)).sort((x, y) => y.m - x.m || y.day - x.day) : [];
    const realisasi = a.svcs ? txs.reduce((s, t) => s + t.amount, 0) : (manual[a.kode] ?? 0);
    return { ...a, isManual: !a.svcs, txs, realisasi };
  }), [periodList, manual]);

  const perAkun = akun === "all" ? perAkunAll : perAkunAll.filter((a) => a.kode === akun);
  const total = perAkun.reduce((a, r) => a + r.realisasi, 0);

  const monthItems = MONTHS.map((mn, i) => ({ i, mn })).filter(({ i }) => !(year === CUR_YEAR && i > CUR_MONTH));
  const periodeLabel =
    month !== "all" ? `${MONTHS[month]} ${year}`
      : range?.from ? `${format(range.from, "d MMM yyyy", { locale: localeId })} – ${format(range.to ?? range.from, "d MMM yyyy", { locale: localeId })}`
        : `Sepanjang tahun ${year}`;
  const akunLabel = akun === "all" ? "Semua Akun" : akun;

  function openEdit(a: Akun) { setFormVal(manual[a.kode] ?? 0); setEdit(a); }
  function save() {
    if (!edit) return;
    setManual((prev) => {
      const next = { ...prev, [edit.kode]: formVal };
      try { localStorage.setItem(STORE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    setEdit(null);
  }

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
    const sub = `PERIODE: ${periodeLabel.toUpperCase()} · ${akunLabel.toUpperCase()}`;
    if (view === "rekap") {
      const aoa: (string | number)[][] = [["REKAP PENERIMAAN PER AKUN — PIP MAKASSAR"], [sub], [], ["NO", "Uraian", "Realisasi"],
        ...perAkun.map((r, i) => [i + 1, `${r.kode} | ${r.nama}`, r.realisasi]), ["", "GRAND TOTAL", total]];
      const ws = XLSX.utils.aoa_to_sheet(aoa) as Record<string, any>;
      ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } }];
      ws["!cols"] = [{ wch: 5 }, { wch: 56 }, { wch: 20 }];
      const set = (r: number, c: number, s: Record<string, unknown>) => { const a = XLSX.utils.encode_cell({ r, c }); if (!ws[a]) ws[a] = { t: "s", v: "" }; ws[a].s = { ...(ws[a].s || {}), ...s }; };
      set(0, 0, { font: { bold: true, sz: 13 }, alignment: { horizontal: "center" } }); set(1, 0, { font: { bold: true, sz: 11 }, alignment: { horizontal: "center" } });
      styleCells(ws, 3, 3, () => ({ font: { bold: true }, fill: { patternType: "solid", fgColor: { rgb: "C6E0B4" } }, alignment: { horizontal: "center" }, border }));
      perAkun.forEach((_, i) => styleCells(ws, 4 + i, 3, (c) => ({ border, alignment: { horizontal: c === 0 ? "center" : c === 2 ? "right" : "left" }, ...(c === 2 ? { numFmt: money } : {}) })));
      styleCells(ws, 4 + perAkun.length, 3, (c) => ({ font: { bold: true }, fill: { patternType: "solid", fgColor: { rgb: "FCE4D6" } }, border, alignment: { horizontal: c === 1 ? "left" : c === 2 ? "right" : "center" }, ...(c === 2 ? { numFmt: money } : {}) }));
      saveWb(ws, "Rekap Akun", "Rekap-Penerimaan-Per-Akun.xlsx");
    } else {
      const aoa: (string | number)[][] = [["RINCIAN PENERIMAAN PER AKUN — PIP MAKASSAR"], [sub], [], ["Tanggal", "Layanan", "Pembayar", "Nominal"]];
      const kinds: string[] = ["", "", "", "head"];
      perAkun.forEach((a) => {
        aoa.push([`${a.kode} | ${a.nama}`, "", "", a.realisasi]); kinds.push("group");
        if (a.isManual) { aoa.push([a.realisasi > 0 ? "Input manual" : "Belum diinput", "", "", a.realisasi]); kinds.push("item"); }
        else if (a.txs.length) a.txs.forEach((t) => { aoa.push([tglStr(t), SERVICE_MAP[t.key].name, t.payer + (t.prodi ? ` · ${t.prodi}` : ""), t.amount]); kinds.push("item"); });
        else { aoa.push(["(tidak ada transaksi)", "", "", 0]); kinds.push("item"); }
      });
      aoa.push(["GRAND TOTAL", "", "", total]); kinds.push("total");
      const ws = XLSX.utils.aoa_to_sheet(aoa) as Record<string, any>;
      ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } }];
      ws["!cols"] = [{ wch: 26 }, { wch: 22 }, { wch: 34 }, { wch: 18 }];
      const set = (r: number, c: number, s: Record<string, unknown>) => { const a = XLSX.utils.encode_cell({ r, c }); if (!ws[a]) ws[a] = { t: "s", v: "" }; ws[a].s = { ...(ws[a].s || {}), ...s }; };
      set(0, 0, { font: { bold: true, sz: 13 }, alignment: { horizontal: "center" } }); set(1, 0, { font: { bold: true, sz: 11 }, alignment: { horizontal: "center" } });
      kinds.forEach((k, r) => {
        if (k === "head") styleCells(ws, r, 4, () => ({ font: { bold: true }, fill: { patternType: "solid", fgColor: { rgb: "C6E0B4" } }, alignment: { horizontal: "center" }, border }));
        if (k === "group") { ws["!merges"]!.push({ s: { r, c: 0 }, e: { r, c: 2 } }); styleCells(ws, r, 4, (c) => ({ font: { bold: true }, fill: { patternType: "solid", fgColor: { rgb: "D9E1F2" } }, border, alignment: { horizontal: c === 3 ? "right" : "left" }, ...(c === 3 ? { numFmt: money } : {}) })); }
        if (k === "item") styleCells(ws, r, 4, (c) => ({ border, alignment: { horizontal: c === 3 ? "right" : "left" }, ...(c === 3 ? { numFmt: money } : {}) }));
        if (k === "total") { ws["!merges"]!.push({ s: { r, c: 0 }, e: { r, c: 2 } }); styleCells(ws, r, 4, (c) => ({ font: { bold: true }, fill: { patternType: "solid", fgColor: { rgb: "FCE4D6" } }, border, alignment: { horizontal: c === 3 ? "right" : "left" }, ...(c === 3 ? { numFmt: money } : {}) })); }
      });
      saveWb(ws, "Rincian Akun", "Rincian-Penerimaan-Per-Akun.xlsx");
    }
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold"><Landmark className="size-4" /> Rekap Penerimaan per Akun</h3>
          <p className="text-xs text-muted-foreground">Realisasi pendapatan per akun (424xxx) · {periodeLabel} · {akunLabel}</p>
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
          <Select value={String(year)} onValueChange={(v) => { setYear(Number(v)); setMonth("all"); setRange(undefined); }}>
            <SelectTrigger className="w-32"><span>Tahun {year}</span></SelectTrigger>
            <SelectContent>{YEARS.map((y) => (<SelectItem key={y} value={String(y)}>Tahun {y}</SelectItem>))}</SelectContent>
          </Select>
        </Field>
        <Field label="Bulan">
          <Select value={month === "all" ? "all" : String(month + 1)} onValueChange={(v) => { setMonth(v === "all" ? "all" : Number(v) - 1); setRange(undefined); }}>
            <SelectTrigger className="w-32"><span>{month === "all" ? "Semua Bulan" : MONTHS[month]}</span></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Bulan</SelectItem>
              {monthItems.map(({ i, mn }) => (<SelectItem key={i} value={String(i + 1)}>{mn}</SelectItem>))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Rentang Tanggal">
          <Popover>
            <PopoverTrigger className={cn("flex h-9 w-60 items-center justify-start gap-2 rounded-md border border-input bg-background px-3 text-left text-sm font-normal shadow-sm transition-colors hover:bg-accent", !range?.from && "text-muted-foreground")}>
              <CalendarIcon className="size-4" />
              {range?.from ? (range.to ? (<>{format(range.from, "d MMM yyyy", { locale: localeId })} – {format(range.to, "d MMM yyyy", { locale: localeId })}</>) : (format(range.from, "d MMM yyyy", { locale: localeId }))) : (<span>Pilih tanggal awal &amp; akhir</span>)}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="range" defaultMonth={range?.from ?? new Date(year, 0, 1)} selected={range} onSelect={(r) => { setRange(r); setMonth("all"); }} numberOfMonths={2} locale={localeId} />
            </PopoverContent>
          </Popover>
        </Field>
        <Field label="Akun">
          <Select value={akun} onValueChange={(v) => setAkun(v ?? "all")}>
            <SelectTrigger className="w-44"><span>{akun === "all" ? "Semua Akun" : akun}</span></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Akun</SelectItem>
              {AKUN.map((a) => (<SelectItem key={a.kode} value={a.kode}>{a.kode} — {a.nama.replace(/^Pendapatan\s+/i, "")}</SelectItem>))}
            </SelectContent>
          </Select>
        </Field>
        <Button variant="outline" onClick={() => { setYear(CUR_YEAR); setMonth("all"); setRange(undefined); setAkun("all"); }}>Reset</Button>
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
                  <TableHead className="text-center">Aksi</TableHead>
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
                    <TableCell className="text-center">
                      {r.isManual
                        ? <Button variant="ghost" size="sm" className="h-8" onClick={() => openEdit(r)}><Pencil className="mr-1 size-3.5" />Input</Button>
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground">Tidak ada akun untuk filter ini.</TableCell></TableRow>
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
              const shownTx = a.txs.slice(0, 150);
              return (
                <div key={a.kode} className="overflow-hidden rounded-lg border">
                  <div className="flex items-center justify-between gap-2 border-b bg-sky-50 px-4 py-2.5 dark:bg-sky-950/30">
                    <span className="inline-flex items-center gap-2 text-sm font-bold text-sky-800 dark:text-sky-300">
                      <span className="font-mono">{a.kode}</span> — {a.nama}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {a.isManual ? "input manual" : `${a.txs.length} transaksi`} · <span className="font-semibold text-foreground">{rupiah(a.realisasi)}</span>
                    </span>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    <table className="w-full table-fixed text-sm">
                      <colgroup>
                        <col style={{ width: 108 }} />
                        <col style={{ width: 150 }} />
                        <col />
                        <col style={{ width: 150 }} />
                      </colgroup>
                      <thead>
                        <tr className="text-xs text-muted-foreground">
                          <th className="sticky top-0 z-10 border-b bg-muted px-3 py-2 text-left font-medium">Tanggal</th>
                          <th className="sticky top-0 z-10 border-b bg-muted px-3 py-2 text-left font-medium">Layanan</th>
                          <th className="sticky top-0 z-10 border-b bg-muted px-3 py-2 text-left font-medium">Pembayar</th>
                          <th className="sticky top-0 z-10 border-b bg-muted px-3 py-2 text-right font-medium">Nominal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {a.isManual ? (
                          <tr className="border-b last:border-0">
                            <td className="px-3 py-2 text-muted-foreground" colSpan={3}>{a.realisasi > 0 ? "Nilai input manual" : "Belum diinput"}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{a.realisasi > 0 ? rupiah(a.realisasi) : "—"}</td>
                          </tr>
                        ) : shownTx.length ? shownTx.map((t) => (
                          <tr key={t.id} className="border-b last:border-0 hover:bg-muted/40">
                            <td className="px-3 py-2 font-mono text-xs">{tglStr(t)}</td>
                            <td className="truncate px-3 py-2">{SERVICE_MAP[t.key].name}</td>
                            <td className="truncate px-3 py-2" title={t.payer}>{t.payer}{t.prodi ? ` · ${t.prodi}` : ""}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{rupiah(t.amount)}</td>
                          </tr>
                        )) : (
                          <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">Tidak ada transaksi pada periode ini.</td></tr>
                        )}
                        {!a.isManual && a.txs.length > 150 && (
                          <tr><td colSpan={4} className="px-3 py-2 text-center text-xs text-muted-foreground">Menampilkan 150 dari {a.txs.length} transaksi · unduhan memuat seluruhnya</td></tr>
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

      {/* Dialog input manual (nilai per akun) */}
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Input Realisasi — {edit?.kode}</DialogTitle>
            <DialogDescription>{edit?.nama}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-1">
            <label className="text-xs font-semibold text-muted-foreground">Realisasi (Rp)</label>
            <Input type="number" min={0} inputMode="numeric" value={Number.isFinite(formVal) ? formVal : 0}
              onChange={(e) => setFormVal(e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)))} />
            <span className="text-[11px] text-muted-foreground">{rupiah(formVal || 0)}</span>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>Batal</Button>
            <Button onClick={save}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
