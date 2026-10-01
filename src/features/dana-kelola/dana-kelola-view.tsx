"use client";

import * as React from "react";
import { Landmark, ChevronRight, ChevronDown, Plus, Pencil, Trash2, Save, Wallet, CalendarIcon, Banknote } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { TRX } from "@/data/mock";
import { SERVICES, SERVICE_MAP, MONTHS, YEARS, CUR_YEAR, CUR_MONTH } from "@/lib/constants";
import { rupiah } from "@/lib/format";
import { usePengesahan } from "@/lib/pengesahan-context";
import { useManualRevenue, type ManualEntry } from "@/lib/manual-revenue-context";
import { rincianOf } from "@/lib/rincian";
import { idTrx, noVA } from "@/lib/trx-format";
import type { ServiceKey, Trx } from "@/types";

const pad = (n: number) => String(n).padStart(2, "0");
const tglE = (e: ManualEntry) => `${pad(e.day)}/${pad(e.m + 1)}/${e.y}`;
const toIso = (e: { y: number; m: number; day: number }) => `${e.y}-${pad(e.m + 1)}-${pad(e.day)}`;
const todayIso = () => new Date().toISOString().slice(0, 10);

// Sumber penerimaan manual (di luar aplikasi)
const SUMBER = ["Bunga Bank", "Deposito BLU", "Jasa Perbankan Lainnya", "Sewa Ruangan", "Sewa Peralatan & Mesin", "Lain-lain BLU"];
// Rekening penampung pembayaran per layanan
const REKENING = ["REK BNI RS", "REK BUKOPIN", "REK BNI DIKLAT"];
// Dana operasional dari rekening BLU PIP Makassar (sementara statis; akan disinkronkan dari rekening bank)
const DANA_OPERASIONAL = 35545318121;
function atStartOfDay(d: Date): Date { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
const idMan = (e: ManualEntry) => `MAN-${e.y}-${e.id.replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase()}`;
function rekOf(t: Trx): string {
  if (t.key === "rs") return "REK BNI RS";
  if (t.key === "kerjasama" || t.key === "ticketing") return "REK BUKOPIN";
  return "REK BNI DIKLAT";
}
const fmtNum = (n: number) => (n ? n.toLocaleString("id-ID") : "");
const parseNum = (v: string) => { const d = v.replace(/\D/g, ""); return d === "" ? 0 : Number(d); };

export function DanaKelolaView() {
  const { ratified } = usePengesahan();
  const { entries, add, update, remove } = useManualRevenue();
  const [year, setYear] = React.useState<number>(CUR_YEAR);
  const [month, setMonth] = React.useState<number | "all">("all");
  const [svc, setSvc] = React.useState<ServiceKey | "all">("all");
  const [rek, setRek] = React.useState<string>("all");
  const [range, setRange] = React.useState<DateRange | undefined>(undefined);
  const [expanded, setExpanded] = React.useState<Set<number>>(new Set());

  // dialog entri manual
  const [dlg, setDlg] = React.useState<null | { mode: "add" | "edit"; entry?: ManualEntry }>(null);
  const [ef, setEf] = React.useState<{ tgl: string; sumber: string; uraian: string; nominal: number }>({ tgl: todayIso(), sumber: SUMBER[0], uraian: "", nominal: 0 });
  const [delE, setDelE] = React.useState<ManualEntry | null>(null);

  const filtered = React.useMemo(() => {
    return TRX.filter((t) => {
      if (ratified.has(t.id)) return false;
      if (t.y !== year) return false;
      if (month !== "all") { if (t.m !== month) return false; }
      else if (range?.from) {
        const from = atStartOfDay(range.from); const to = atStartOfDay(range.to ?? range.from);
        const d = atStartOfDay(new Date(t.y, t.m, t.day));
        if (d < from || d > to) return false;
      }
      if (svc !== "all" && t.key !== svc) return false;
      if (rek !== "all" && rekOf(t) !== rek) return false;
      return true;
    }).sort((a, b) => b.m - a.m || b.day - a.day);
  }, [ratified, year, month, svc, rek, range]);

  // Penerimaan manual sesuai periode (tak terkait layanan → hanya saat "Semua Layanan")
  const manualList = React.useMemo(() => {
    if (svc !== "all" || rek !== "all") return [];
    return entries.filter((e) => {
      if (e.y !== year) return false;
      if (month !== "all") return e.m === month;
      if (range?.from) {
        const from = atStartOfDay(range.from); const to = atStartOfDay(range.to ?? range.from);
        const d = atStartOfDay(new Date(e.y, e.m, e.day));
        return d >= from && d <= to;
      }
      return true;
    }).sort((a, b) => b.m - a.m || b.day - a.day);
  }, [entries, year, month, svc, rek, range]);
  const manualTotal = manualList.reduce((a, e) => a + e.nominal, 0);

  const trxTotal = filtered.reduce((a, t) => a + t.amount, 0);
  const total = trxTotal + manualTotal;
  const shown = filtered.slice(0, 100);
  const monthItems = MONTHS.map((mn, i) => ({ i, mn })).filter(({ i }) => !(year === CUR_YEAR && i > CUR_MONTH));

  function toggle(id: number) {
    setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function openAdd() { setEf({ tgl: todayIso(), sumber: SUMBER[0], uraian: "", nominal: 0 }); setDlg({ mode: "add" }); }
  function openEdit(e: ManualEntry) { setEf({ tgl: toIso(e), sumber: e.sumber, uraian: e.uraian, nominal: e.nominal }); setDlg({ mode: "edit", entry: e }); }
  function saveEntry() {
    const uraian = ef.uraian.trim();
    if (!uraian || !ef.tgl) return;
    const [y, mm, dd] = ef.tgl.split("-").map(Number);
    const payload = { y, m: (mm || 1) - 1, day: dd || 1, sumber: ef.sumber, uraian, nominal: ef.nominal };
    if (dlg?.mode === "edit" && dlg.entry) update(dlg.entry.id, payload);
    else add(payload);
    setDlg(null);
  }

  return (
    <div className="space-y-5">
      {/* Ringkasan */}
      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            <div className="flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-xl bg-sky-700/15 text-sky-700">
                <Landmark className="size-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total Dana Kelola (belum disahkan)</p>
                <p className="text-2xl font-extrabold tabular-nums">{rupiah(total)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-xl bg-teal-700/15 text-teal-700">
                <Banknote className="size-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Dana Operasional</p>
                <p className="text-2xl font-extrabold tabular-nums">{rupiah(DANA_OPERASIONAL)}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-8 pr-2">
            <div>
              <p className="text-xs text-muted-foreground">Transaksi Aplikasi</p>
              <p className="text-lg font-bold tabular-nums">{filtered.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Penerimaan Manual</p>
              <p className="text-lg font-bold tabular-nums">{svc === "all" && rek === "all" ? `${manualList.length} · ${rupiah(manualTotal)}` : "—"}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Filter */}
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Tahun">
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
            <PopoverTrigger className={cn("flex h-9 w-60 items-center justify-start gap-2 rounded-md border border-input bg-background px-3 text-left text-sm font-normal shadow-sm transition-colors hover:bg-accent", !range?.from && "text-muted-foreground")}>
              <CalendarIcon className="size-4" />
              {range?.from ? (range.to ? (<>{format(range.from, "d MMM yyyy", { locale: localeId })} – {format(range.to, "d MMM yyyy", { locale: localeId })}</>) : (format(range.from, "d MMM yyyy", { locale: localeId }))) : (<span>Pilih tanggal awal &amp; akhir</span>)}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="range" defaultMonth={range?.from ?? new Date(year, 0, 1)} selected={range} onSelect={(r) => { setRange(r); setMonth("all"); }} numberOfMonths={2} locale={localeId} />
            </PopoverContent>
          </Popover>
        </Field>
        <Field label="Layanan">
          <Select value={svc} onValueChange={(v) => setSvc(v as ServiceKey | "all")}>
            <SelectTrigger className="w-52"><span>{svc === "all" ? "Semua Layanan" : SERVICE_MAP[svc].name}</span></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Layanan</SelectItem>
              {SERVICES.map((s) => (<SelectItem key={s.key} value={s.key}>{s.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Rekening">
          <Select value={rek} onValueChange={(v) => setRek(v ?? "all")}>
            <SelectTrigger className="w-48"><span>{rek === "all" ? "Semua Rekening" : rek}</span></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Rekening</SelectItem>
              {REKENING.map((r) => (<SelectItem key={r} value={r}>{r}</SelectItem>))}
            </SelectContent>
          </Select>
        </Field>
        <div className="ml-auto">
          <Button onClick={openAdd}><Plus className="mr-1.5 size-4" />Tambah Penerimaan</Button>
        </div>
      </div>

      {/* Penerimaan Manual (tampil saat Semua Layanan) */}
      {svc === "all" && rek === "all" && (
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold"><Wallet className="size-4" /> Penerimaan Manual</h3>
              <p className="text-xs text-muted-foreground">Penerimaan di luar aplikasi (deposito BLU, bunga bank, sewa, dll.)</p>
            </div>
            <Badge variant="secondary">{manualList.length} entri</Badge>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>ID Transaksi</TableHead>
                  <TableHead>No. VA</TableHead>
                  <TableHead>Sumber</TableHead>
                  <TableHead>Uraian</TableHead>
                  <TableHead className="text-right">Nominal</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {manualList.length ? manualList.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-xs">{tglE(e)}</TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-[11px]">{idMan(e)}</TableCell>
                    <TableCell className="text-center text-muted-foreground">—</TableCell>
                    <TableCell><Badge variant="secondary">{e.sumber}</Badge></TableCell>
                    <TableCell className="font-medium">{e.uraian}</TableCell>
                    <TableCell className="text-right tabular-nums">{rupiah(e.nominal)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" className="size-8" title="Edit" onClick={() => openEdit(e)}><Pencil className="size-4" /></Button>
                        <Button variant="ghost" size="icon" className="size-8 text-rose-600 hover:text-rose-700" title="Hapus" onClick={() => setDelE(e)}><Trash2 className="size-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Belum ada penerimaan manual. Klik <b>Tambah Penerimaan</b> untuk mencatat (mis. bunga bank / deposito).</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between border-t bg-muted/40 px-5 py-3 text-sm">
            <span className="font-semibold">Total Penerimaan Manual</span>
            <span className="font-bold tabular-nums">{rupiah(manualTotal)}</span>
          </div>
        </Card>
      )}

      {/* Tabel transaksi aplikasi */}
      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h3 className="text-sm font-bold">Rincian Pendapatan Dana Kelola</h3>
            <p className="text-xs text-muted-foreground">
              Menampilkan {shown.length} dari {filtered.length} transaksi · klik uraian untuk melihat jenis tagihan
            </p>
          </div>
          <Badge variant="secondary">{filtered.length} transaksi</Badge>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>ID Transaksi</TableHead>
                <TableHead>No. VA</TableHead>
                <TableHead>Layanan</TableHead>
                <TableHead>Rekening</TableHead>
                <TableHead>Uraian Pembayar</TableHead>
                <TableHead className="text-right">Nominal</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.length ? shown.map((t) => {
                const isOpen = expanded.has(t.id);
                return (
                  <React.Fragment key={t.id}>
                    <TableRow className="cursor-pointer" onClick={() => toggle(t.id)}>
                      <TableCell className="font-mono text-xs">{pad(t.day)}/{pad(t.m + 1)}/{t.y}</TableCell>
                      <TableCell className="whitespace-nowrap font-mono text-[11px]">{idTrx(t)}</TableCell>
                      <TableCell className="whitespace-nowrap font-mono text-[11px]">{noVA(t)}</TableCell>
                      <TableCell>{SERVICE_MAP[t.key].name}</TableCell>
                      <TableCell><Badge variant="secondary">{rekOf(t)}</Badge></TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5">
                          {isOpen ? <ChevronDown className="size-3.5 text-muted-foreground" /> : <ChevronRight className="size-3.5 text-muted-foreground" />}
                          <span className={cn(isOpen && "font-medium")}>{t.payer}{t.prodi ? ` · ${t.prodi}` : ""}</span>
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{rupiah(t.amount)}</TableCell>
                      <TableCell><Badge variant="outline">Belum Disahkan</Badge></TableCell>
                    </TableRow>
                    {isOpen && (
                      <TableRow className="bg-muted/20 hover:bg-muted/20">
                        <TableCell colSpan={8} className="py-0">
                          <div className="my-2 ml-6 overflow-hidden rounded-lg border bg-background">
                            <div className="border-b bg-muted/40 px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                              Rincian jenis tagihan yang dibayarkan
                            </div>
                            <table className="w-full text-sm">
                              <tbody>
                                {rincianOf(t).map((it, i) => (
                                  <tr key={i} className="border-b last:border-0">
                                    <td className="px-3 py-1.5">{it.jenis}</td>
                                    <td className="px-3 py-1.5 text-right tabular-nums">{rupiah(it.nominal)}</td>
                                  </tr>
                                ))}
                                <tr className="border-t bg-muted/30 font-semibold">
                                  <td className="px-3 py-1.5">Total</td>
                                  <td className="px-3 py-1.5 text-right tabular-nums">{rupiah(t.amount)}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              }) : (
                <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">Tidak ada dana kelola pada filter ini.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between border-t bg-muted/40 px-5 py-3 text-sm">
          <span className="font-semibold">Total Transaksi Aplikasi</span>
          <span className="font-bold tabular-nums">{rupiah(trxTotal)}</span>
        </div>
      </Card>

      {/* Dialog tambah/edit penerimaan manual */}
      <Dialog open={!!dlg} onOpenChange={(o) => !o && setDlg(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dlg?.mode === "edit" ? "Edit Penerimaan" : "Tambah Penerimaan"}</DialogTitle>
            <DialogDescription>Penerimaan yang tidak melalui aplikasi (mis. deposito BLU, bunga bank, sewa).</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Sumber</label>
              <Select value={ef.sumber} onValueChange={(v) => setEf((f) => ({ ...f, sumber: v }))}>
                <SelectTrigger><span>{ef.sumber}</span></SelectTrigger>
                <SelectContent>{SUMBER.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Tanggal</label>
                <Input type="date" value={ef.tgl} onChange={(e) => setEf((f) => ({ ...f, tgl: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Nominal (Rp)</label>
                <Input type="text" inputMode="numeric" value={fmtNum(ef.nominal)}
                  onChange={(e) => setEf((f) => ({ ...f, nominal: parseNum(e.target.value) }))} placeholder="0" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Uraian</label>
              <Input value={ef.uraian} onChange={(e) => setEf((f) => ({ ...f, uraian: e.target.value }))} placeholder="mis. Bunga giro September / Deposito BLU jatuh tempo" autoFocus />
              <span className="text-[11px] text-muted-foreground">{rupiah(ef.nominal || 0)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDlg(null)}>Batal</Button>
            <Button onClick={saveEntry} disabled={!ef.uraian.trim() || !ef.tgl}><Save className="mr-1.5 size-4" />Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Konfirmasi hapus */}
      <Dialog open={!!delE} onOpenChange={(o) => !o && setDelE(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Penerimaan Manual?</DialogTitle>
            <DialogDescription>“{delE?.uraian}” ({delE ? rupiah(delE.nominal) : ""}) akan dihapus.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDelE(null)}>Batal</Button>
            <Button className="bg-rose-600 text-white hover:bg-rose-700" onClick={() => { if (delE) remove(delE.id); setDelE(null); }}><Trash2 className="mr-1.5 size-4" />Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
