"use client";

import * as React from "react";
import { Search, Download, Eye, ArrowLeft, ReceiptText, Anchor } from "lucide-react";
import * as XLSX from "xlsx-js-style";
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
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { TAGIHAN } from "@/data/mock";
import { PRODI } from "@/lib/constants";
import { rupiah } from "@/lib/format";
import type { Tagihan } from "@/types";

const pad = (n: number) => String(n).padStart(2, "0");
const invNo = (t: Tagihan) => `INV/PIP/2026/${String(t.id).padStart(5, "0")}`;
const tglBayar = (t: Tagihan) => `${pad(((t.id * 3) % 28) + 1)}/${pad((t.id % 9) + 1)}/2026`;

function buildSheet(opts: {
  titles: string[]; header: string[]; rows: (string | number)[][];
  total?: (string | number)[]; moneyCols: number[]; centerCols: number[];
  colWidths: number[]; totalMergeTo?: number;
}) {
  const { titles, header, rows, total, moneyCols, centerCols, colWidths, totalMergeTo } = opts;
  const aoa: (string | number)[][] = [];
  titles.forEach((t) => aoa.push([t]));
  aoa.push([]);
  const headerRow = aoa.length;
  aoa.push(header);
  const dataStart = aoa.length;
  rows.forEach((r) => aoa.push(r));
  const totRow = total ? aoa.length : -1;
  if (total) aoa.push(total);
  const ws = XLSX.utils.aoa_to_sheet(aoa) as Record<string, any>;
  const nCols = header.length;
  const lastCol = nCols - 1;
  const merges: any[] = titles.map((_, i) => ({ s: { r: i, c: 0 }, e: { r: i, c: lastCol } }));
  if (total && typeof totalMergeTo === "number") merges.push({ s: { r: totRow, c: 0 }, e: { r: totRow, c: totalMergeTo } });
  ws["!merges"] = merges;
  ws["!cols"] = colWidths.map((w) => ({ wch: w }));
  const border = {
    top: { style: "thin", color: { rgb: "000000" } }, bottom: { style: "thin", color: { rgb: "000000" } },
    left: { style: "thin", color: { rgb: "000000" } }, right: { style: "thin", color: { rgb: "000000" } },
  };
  const green = { patternType: "solid", fgColor: { rgb: "C6E0B4" } };
  const money = '"Rp"#,##0';
  const setStyle = (r: number, c: number, s: Record<string, unknown>) => {
    const a = XLSX.utils.encode_cell({ r, c });
    if (!ws[a]) ws[a] = { t: "s", v: "" };
    ws[a].s = { ...(ws[a].s || {}), ...s };
  };
  titles.forEach((_, i) => setStyle(i, 0, { font: { bold: true, sz: i === 0 ? 13 : 11 }, alignment: { horizontal: "center", vertical: "center" } }));
  for (let c = 0; c < nCols; c++) setStyle(headerRow, c, { font: { bold: true }, fill: green, alignment: { horizontal: "center", vertical: "center" }, border });
  for (let i = 0; i < rows.length; i++) {
    const r = dataStart + i;
    for (let c = 0; c < nCols; c++) {
      const align = moneyCols.includes(c) ? "right" : centerCols.includes(c) ? "center" : "left";
      const extra = moneyCols.includes(c) ? { numFmt: money } : {};
      setStyle(r, c, { alignment: { horizontal: align }, border, ...extra });
    }
  }
  if (total) {
    for (let c = 0; c < nCols; c++) {
      const s: Record<string, unknown> = { font: { bold: true }, border };
      if (c === 0) s.alignment = { horizontal: "right" };
      if (moneyCols.includes(c)) { s.alignment = { horizontal: "right" }; s.numFmt = money; }
      setStyle(totRow, c, s);
    }
  }
  ws["!rows"] = [];
  ws["!rows"][headerRow] = { hpt: 22 };
  return ws;
}
function downloadWb(ws: unknown, sheetName: string, filename: string) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws as any, sheetName);
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}

type Mode = "rekap" | "detail";
type TaruRow = { nit: string; nama: string; prodi: string; sem: number; jumlah: number; total: number };

export function TagihanView() {
  const [mode, setMode] = React.useState<Mode>("rekap");
  const [fProdi, setFProdi] = React.useState<string>("all");
  const [fSem, setFSem] = React.useState<number | "all">("all");
  const [q, setQ] = React.useState("");
  const [selectedNit, setSelectedNit] = React.useState<string | null>(null);
  const [invoiceBill, setInvoiceBill] = React.useState<Tagihan | null>(null);

  const groups = React.useMemo(() => {
    const out: { prodi: string; sem: number; jumlah: number; piutang: number }[] = [];
    for (const p of PRODI) {
      for (let s = 1; s <= 8; s++) {
        const unpaid = TAGIHAN.filter((t) => t.prodi === p && t.sem === s && !t.lunas);
        if (!unpaid.length) continue;
        out.push({ prodi: p, sem: s, jumlah: unpaid.length, piutang: unpaid.reduce((a, t) => a + t.nominal, 0) });
      }
    }
    return out;
  }, []);
  const rekapRows = groups.filter((g) => (fProdi === "all" || g.prodi === fProdi) && (fSem === "all" || g.sem === fSem));
  const rekapPiutang = rekapRows.reduce((a, g) => a + g.piutang, 0);
  const rekapJumlah = rekapRows.reduce((a, g) => a + g.jumlah, 0);
  const isFiltered = fProdi !== "all" || fSem !== "all";

  const detailTaruna = React.useMemo<TaruRow[]>(() => {
    const query = q.trim().toLowerCase();
    const map = new Map<string, TaruRow>();
    for (const t of TAGIHAN) {
      if (t.lunas) continue;
      if (fSem !== "all" && t.sem !== fSem) continue;
      if (fProdi !== "all" && t.prodi !== fProdi) continue;
      if (query && !(t.nit.toLowerCase().includes(query) || t.nama.toLowerCase().includes(query))) continue;
      const e = map.get(t.nit);
      if (e) { e.jumlah += 1; e.total += t.nominal; }
      else map.set(t.nit, { nit: t.nit, nama: t.nama, prodi: t.prodi, sem: t.sem, jumlah: 1, total: t.nominal });
    }
    return Array.from(map.values());
  }, [fSem, fProdi, q]);
  const detailTotal = detailTaruna.reduce((a, r) => a + r.total, 0);

  // Rincian tagihan satu taruna (SEMUA jenis: lunas & belum)
  const taruBills = selectedNit ? TAGIHAN.filter((t) => t.nit === selectedNit) : [];
  const taruInfo = taruBills[0];
  const taruTotal = taruBills.reduce((a, t) => a + t.nominal, 0);
  const taruBelum = taruBills.filter((t) => !t.lunas).reduce((a, t) => a + t.nominal, 0);

  function drill(prodi: string, sem: number) {
    setFProdi(prodi); setFSem(sem); setQ(""); setMode("detail");
  }

  function unduhRekap() {
    const rows = rekapRows.map((g) => [g.prodi, `Semester ${g.sem}`, g.jumlah, g.piutang]);
    const total: (string | number)[] = ["TOTAL", "", rekapJumlah, rekapPiutang];
    const ws = buildSheet({
      titles: ["REKAP PIUTANG TAGIHAN TARUNA — POLITEKNIK ILMU PELAYARAN MAKASSAR", "TAGIHAN BELUM DIBAYAR PER PROGRAM STUDI & SEMESTER"],
      header: ["Program Studi", "Semester", "Jumlah Tagihan", "Piutang"],
      rows, total, moneyCols: [3], centerCols: [1, 2], colWidths: [18, 12, 14, 18], totalMergeTo: 1,
    });
    downloadWb(ws, "Rekap", "Rekap-Piutang-Tagihan.xlsx");
  }
  function unduhDetail() {
    const semText = fSem === "all" ? "Semua Semester" : `Semester ${fSem}`;
    const prodiText = fProdi === "all" ? "Semua Prodi" : fProdi;
    const rows = detailTaruna.map((r, i) => [i + 1, r.nit, r.nama, r.prodi, `Semester ${r.sem}`, r.jumlah, r.total]);
    const totJml = detailTaruna.reduce((a, r) => a + r.jumlah, 0);
    const total: (string | number)[] = ["TOTAL", "", "", "", "", totJml, detailTotal];
    const ws = buildSheet({
      titles: ["DAFTAR PIUTANG TARUNA — POLITEKNIK ILMU PELAYARAN MAKASSAR", `FILTER : ${semText} · ${prodiText}`],
      header: ["NO", "NIT", "Nama", "Prodi", "Semester", "Jumlah Tagihan", "Total Piutang"],
      rows, total, moneyCols: [6], centerCols: [0, 1, 4, 5], colWidths: [5, 12, 22, 14, 11, 14, 16], totalMergeTo: 4,
    });
    downloadWb(ws, "Piutang", "Daftar-Piutang-Taruna.xlsx");
  }
  // Unduh Rincian tagihan satu taruna
  function unduhRincian() {
    if (!taruInfo) return;
    const rows = taruBills.map((t, i) => [
      i + 1, t.nit, t.nama, t.prodi, `Semester ${t.sem}`, t.jenis, t.nominal, t.lunas ? "Lunas" : "Belum Bayar",
    ]);
    const total: (string | number)[] = ["TOTAL", "", "", "", "", "", taruTotal, ""];
    const ws = buildSheet({
      titles: [
        `RINCIAN TAGIHAN TARUNA — ${taruInfo.nama}`,
        `${taruInfo.nit} · ${taruInfo.prodi} · Semester ${taruInfo.sem}`,
      ],
      header: ["NO", "NIT", "Nama", "Prodi", "Semester", "Jenis Tagihan", "Nominal", "Status"],
      rows, total, moneyCols: [6], centerCols: [0, 1, 4, 7], colWidths: [5, 12, 20, 14, 11, 22, 16, 14], totalMergeTo: 5,
    });
    downloadWb(ws, "Rincian", `Rincian-Tagihan-${taruInfo.nit}.xlsx`);
  }

  return (
    <div className="space-y-5">
      {/* ===== REKAP ===== */}
      {mode === "rekap" && (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Program Studi">
              <Select value={fProdi} onValueChange={(v) => setFProdi(v ?? "all")}>
                <SelectTrigger className="w-44"><span>{fProdi === "all" ? "Semua Prodi" : fProdi}</span></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Prodi</SelectItem>
                  {PRODI.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Semester">
              <Select value={String(fSem)} onValueChange={(v) => setFSem(v === "all" ? "all" : Number(v))}>
                <SelectTrigger className="w-40"><span>{fSem === "all" ? "Semua Semester" : `Semester ${fSem}`}</span></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Semester</SelectItem>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (<SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
            {isFiltered && (<Button variant="outline" onClick={() => { setFProdi("all"); setFSem("all"); }}>Reset</Button>)}
            <Button variant="outline" onClick={unduhRekap}><Download className="mr-1.5 size-4" />Unduh Rekap</Button>
            <Button variant="outline" onClick={() => { setQ(""); setMode("detail"); }}><Eye className="mr-1.5 size-4" />Lihat Semua Detail</Button>
          </div>

          <Card className="overflow-hidden p-0">
            <div className="border-b px-5 py-4">
              <h3 className="text-sm font-bold">Rekap Piutang Tagihan Taruna</h3>
              <p className="text-xs text-muted-foreground">Tagihan belum dibayar, per Program Studi &amp; Semester</p>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Program Studi</TableHead><TableHead>Semester</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead className="text-right">Piutang</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rekapRows.length ? rekapRows.map((g) => (
                    <TableRow key={`${g.prodi}-${g.sem}`}>
                      <TableCell className="font-medium">{g.prodi}</TableCell>
                      <TableCell>Semester {g.sem}</TableCell>
                      <TableCell className="text-right tabular-nums">{g.jumlah}</TableCell>
                      <TableCell className="text-right tabular-nums text-rose-600">{rupiah(g.piutang)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-8" onClick={() => drill(g.prodi, g.sem)}><Eye className="mr-1 size-4" />Detail</Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Tidak ada piutang untuk filter ini.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between border-t bg-muted/40 px-5 py-3 text-sm">
              <span className="font-semibold">Total Piutang ({rekapJumlah} tagihan)</span>
              <span className="font-bold tabular-nums text-rose-600">{rupiah(rekapPiutang)}</span>
            </div>
          </Card>
        </>
      )}

      {/* ===== DETAIL: daftar per taruna ===== */}
      {mode === "detail" && !selectedNit && (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <Button variant="outline" onClick={() => setMode("rekap")}><ArrowLeft className="mr-1.5 size-4" />Kembali ke Rekap</Button>
            <Field label="Program Studi">
              <Select value={fProdi} onValueChange={(v) => setFProdi(v ?? "all")}>
                <SelectTrigger className="w-44"><span>{fProdi === "all" ? "Semua Prodi" : fProdi}</span></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Prodi</SelectItem>
                  {PRODI.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Semester">
              <Select value={String(fSem)} onValueChange={(v) => setFSem(v === "all" ? "all" : Number(v))}>
                <SelectTrigger className="w-36"><span>{fSem === "all" ? "Semua Semester" : `Semester ${fSem}`}</span></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Semester</SelectItem>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (<SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Cari NIT / Nama">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="w-52 pl-8" placeholder="mis. Andi atau 24N101" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
            </Field>
            <Button onClick={unduhDetail} disabled={detailTaruna.length === 0}><Download className="mr-1.5 size-4" />Unduh Data</Button>
          </div>

          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h3 className="text-sm font-bold">Piutang per Taruna</h3>
                <p className="text-xs text-muted-foreground">{fProdi === "all" ? "Semua Prodi" : fProdi}{fSem === "all" ? "" : ` · Semester ${fSem}`} · klik “Lihat” untuk rincian tagihan</p>
              </div>
              <Badge variant="secondary">{detailTaruna.length} taruna</Badge>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>NIT</TableHead><TableHead>Nama</TableHead><TableHead>Prodi</TableHead><TableHead>Semester</TableHead>
                    <TableHead className="text-right">Jumlah Tagihan</TableHead>
                    <TableHead className="text-right">Total Piutang</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailTaruna.length ? detailTaruna.map((r) => (
                    <TableRow key={r.nit}>
                      <TableCell className="font-mono text-xs">{r.nit}</TableCell>
                      <TableCell className="font-medium">{r.nama}</TableCell>
                      <TableCell><Badge variant="secondary">{r.prodi}</Badge></TableCell>
                      <TableCell>Sem {r.sem}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.jumlah}</TableCell>
                      <TableCell className="text-right tabular-nums text-rose-600">{rupiah(r.total)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-8" onClick={() => setSelectedNit(r.nit)}><Eye className="mr-1 size-4" />Lihat</Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Tidak ada taruna dengan piutang untuk filter ini.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between border-t bg-muted/40 px-5 py-3 text-sm">
              <span>Total piutang (sesuai filter)</span>
              <span className="font-bold tabular-nums text-rose-600">{rupiah(detailTotal)}</span>
            </div>
          </Card>
        </>
      )}

      {/* ===== RINCIAN TAGIHAN SATU TARUNA (tabel, bukan modal) ===== */}
      {mode === "detail" && selectedNit && taruInfo && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={() => setSelectedNit(null)}><ArrowLeft className="mr-1.5 size-4" />Kembali</Button>
            <Button onClick={unduhRincian}><Download className="mr-1.5 size-4" />Unduh Excel</Button>
          </div>

          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h3 className="text-sm font-bold">Rincian Tagihan Pembayaran Taruna</h3>
                <p className="text-xs text-muted-foreground">{taruInfo.nama} · {taruInfo.nit} · {taruInfo.prodi} · Semester {taruInfo.sem}</p>
              </div>
              <Badge variant="secondary">{taruBills.length} tagihan</Badge>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>NIT</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Prodi</TableHead>
                    <TableHead>Semester</TableHead>
                    <TableHead>Jenis Tagihan</TableHead>
                    <TableHead className="text-right">Nominal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Invoice</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taruBills.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-xs">{t.nit}</TableCell>
                      <TableCell className="font-medium">{t.nama}</TableCell>
                      <TableCell><Badge variant="secondary">{t.prodi}</Badge></TableCell>
                      <TableCell>Sem {t.sem}</TableCell>
                      <TableCell>{t.jenis}</TableCell>
                      <TableCell className="text-right tabular-nums">{rupiah(t.nominal)}</TableCell>
                      <TableCell>
                        {t.lunas ? (
                          <Badge className="bg-emerald-600 hover:bg-emerald-600">Lunas</Badge>
                        ) : (
                          <Badge className="bg-amber-600 hover:bg-amber-600">Belum Bayar</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {t.lunas ? (
                          <Button variant="ghost" size="icon" className="size-8" title="Lihat invoice" onClick={() => setInvoiceBill(t)}>
                            <Eye className="size-4" />
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between border-t bg-muted/40 px-5 py-3 text-sm">
              <span className="font-semibold">Total Tagihan · Belum Dibayar</span>
              <span className="font-bold tabular-nums">
                {rupiah(taruTotal)} · <span className="text-rose-600">{rupiah(taruBelum)}</span>
              </span>
            </div>
          </Card>
        </>
      )}

      {/* Invoice / bukti pembayaran (untuk tagihan lunas) — tetap modal */}
      <Dialog open={!!invoiceBill} onOpenChange={(o) => !o && setInvoiceBill(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ReceiptText className="size-5" /> Bukti Pembayaran</DialogTitle>
            <DialogDescription>Invoice tagihan yang telah lunas</DialogDescription>
          </DialogHeader>
          {invoiceBill && (
            <div className="rounded-xl border">
              <div className="flex items-center gap-3 border-b bg-muted/40 px-4 py-3">
                <div className="grid size-10 place-items-center rounded-lg bg-sky-700 text-white"><Anchor className="size-5" /></div>
                <div>
                  <p className="text-sm font-bold leading-tight">Politeknik Ilmu Pelayaran Makassar</p>
                  <p className="text-xs text-muted-foreground">Bukti Pembayaran Resmi</p>
                </div>
              </div>
              <div className="space-y-2.5 px-4 py-4 text-sm">
                <Row k="No. Invoice" v={invNo(invoiceBill)} mono />
                <Row k="Nama" v={invoiceBill.nama} />
                <Row k="NIT" v={invoiceBill.nit} mono />
                <Row k="Program Studi" v={`${invoiceBill.prodi} · Semester ${invoiceBill.sem}`} />
                <div className="my-1 border-t" />
                <Row k="Jenis Tagihan" v={invoiceBill.jenis} />
                <Row k="Tanggal Bayar" v={tglBayar(invoiceBill)} />
                <Row k="Metode" v="Virtual Account BNI" />
                <div className="my-1 border-t" />
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Jumlah Dibayar</span>
                  <span className="text-lg font-extrabold tabular-nums">{rupiah(invoiceBill.nominal)}</span>
                </div>
              </div>
              <div className="flex items-center justify-between border-t bg-emerald-50 px-4 py-3 dark:bg-emerald-950/40">
                <span className="text-xs text-muted-foreground">Status pembayaran</span>
                <span className="rounded-md border-2 border-emerald-600 px-3 py-1 text-sm font-extrabold uppercase tracking-wider text-emerald-600">Lunas</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground">{k}</span>
      <span className={mono ? "font-mono text-xs" : "font-medium"}>{v}</span>
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
