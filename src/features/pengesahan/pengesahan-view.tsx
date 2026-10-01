"use client";

import * as React from "react";
import { Check, Stamp, CheckCircle2, Eye, Hourglass, ArrowLeft } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { TRX } from "@/data/mock";
import { SERVICES, SERVICE_MAP, MONTHS, YEARS, CUR_YEAR, CUR_MONTH } from "@/lib/constants";
import { rupiah } from "@/lib/format";
import { usePengesahan } from "@/lib/pengesahan-context";
import type { PengesahanBatch } from "@/lib/pengesahan-context";
import type { ServiceKey } from "@/types";
import { DisahkanAkun } from "@/features/pengesahan/disahkan-akun";
import { idTrx, noVA } from "@/lib/trx-format";
import { rincianOf } from "@/lib/rincian";

const pad = (n: number) => String(n).padStart(2, "0");
function fmtTgl(iso: string) {
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
}
const todayIso = () => new Date().toISOString().slice(0, 10);

export function PengesahanView() {
  const { ratified, batches, sahkan } = usePengesahan();
  const [year, setYear] = React.useState<number>(CUR_YEAR);
  const [month, setMonth] = React.useState<number | "all">("all");
  const [svc, setSvc] = React.useState<ServiceKey | "all">("all");
  const [selected, setSelected] = React.useState<Set<number>>(new Set());

  // modal form pengesahan
  const [formOpen, setFormOpen] = React.useState(false);
  const [nama, setNama] = React.useState("");
  const [nomor, setNomor] = React.useState("");
  const [tanggal, setTanggal] = React.useState(todayIso());
  const [keterangan, setKeterangan] = React.useState("");

  // modal detail riwayat
  const [selBatch, setSelBatch] = React.useState<PengesahanBatch | null>(null);

  // tab: tampilkan tabel "rincian" (untuk disahkan) atau "riwayat" (sudah disahkan)
  const [tab, setTab] = React.useState<"rincian" | "riwayat">("rincian");

  const filtered = React.useMemo(() => {
    return TRX.filter((t) => {
      if (ratified.has(t.id)) return false;
      if (t.y !== year) return false;
      if (month !== "all" && t.m !== month) return false;
      if (svc !== "all" && t.key !== svc) return false;
      return true;
    }).sort((a, b) => b.m - a.m || b.day - a.day);
  }, [ratified, year, month, svc]);

  React.useEffect(() => { setSelected(new Set()); }, [year, month, svc]);

  const total = filtered.reduce((a, t) => a + t.amount, 0);
  const shown = filtered.slice(0, 100);
  const selectedList = filtered.filter((t) => selected.has(t.id));
  const selectedTotal = selectedList.reduce((a, t) => a + t.amount, 0);
  const allSelected = filtered.length > 0 && filtered.every((t) => selected.has(t.id));

  // Total sudah disahkan (semua riwayat)
  const disahkanTotal = batches.reduce((a, b) => a + b.total, 0);
  const disahkanCount = batches.reduce((a, b) => a + b.trxIds.length, 0);

  const monthItems = MONTHS.map((mn, i) => ({ i, mn })).filter(({ i }) => !(year === CUR_YEAR && i > CUR_MONTH));

  function toggle(id: number) {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAll() {
    setSelected((prev) => {
      if (allSelected) return new Set();
      const n = new Set(prev); filtered.forEach((t) => n.add(t.id)); return n;
    });
  }
  function openForm() {
    setNama(""); setNomor(""); setTanggal(todayIso()); setKeterangan("");
    setFormOpen(true);
  }
  function submitSahkan() {
    if (!nama.trim()) return;
    sahkan({ nama: nama.trim(), nomor: nomor.trim(), tanggal, keterangan: keterangan.trim(), trxIds: [...selected], total: selectedTotal });
    setSelected(new Set());
    setFormOpen(false);
  }

  // transaksi pada batch yang dibuka
  const batchTrx = React.useMemo(() => {
    if (!selBatch) return [];
    const idSet = new Set(selBatch.trxIds);
    return TRX.filter((t) => idSet.has(t.id)).sort((a, b) => b.m - a.m || b.day - a.day);
  }, [selBatch]);

  return (
    <div className="space-y-5">
      {/* Ringkasan (3 kartu) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard color="#b45309" Icon={Hourglass} title="Menunggu Pengesahan" value={rupiah(total)} sub={`${filtered.length} transaksi`} />
        <SummaryCard color="#059669" Icon={Check} title="Terpilih untuk Disahkan" value={rupiah(selectedTotal)} sub={`${selected.size} transaksi dipilih`} valueClass="text-emerald-600" />
        <SummaryCard color="#12599e" Icon={CheckCircle2} title="Pendapatan Disahkan" value={rupiah(disahkanTotal)} sub={`${disahkanCount} transaksi · ${batches.length} pengesahan`} valueClass="text-sky-700" />
      </div>

      {/* Filter + aksi */}
      <div className="flex flex-wrap items-end gap-3">
        {tab === "rincian" && (
          <>
            <Field label="Tahun">
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="w-32"><span>Tahun {year}</span></SelectTrigger>
                <SelectContent>{YEARS.map((y) => (<SelectItem key={y} value={String(y)}>Tahun {y}</SelectItem>))}</SelectContent>
              </Select>
            </Field>
            <Field label="Bulan">
              <Select value={month === "all" ? "all" : String(month + 1)} onValueChange={(v) => setMonth(v === "all" ? "all" : Number(v) - 1)}>
                <SelectTrigger className="w-32"><span>{month === "all" ? "Semua Bulan" : MONTHS[month]}</span></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Bulan</SelectItem>
                  {monthItems.map(({ i, mn }) => (<SelectItem key={i} value={String(i + 1)}>{mn}</SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Layanan">
              <Select value={svc} onValueChange={(v) => setSvc(v as ServiceKey | "all")}>
                <SelectTrigger className="w-48"><span>{svc === "all" ? "Semua Layanan" : SERVICE_MAP[svc].name}</span></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Layanan</SelectItem>
                  {SERVICES.map((s) => (<SelectItem key={s.key} value={s.key}>{s.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
            <Button onClick={openForm} disabled={selected.size === 0}>
              <Stamp className="mr-1.5 size-4" />Sahkan Terpilih ({selected.size})
            </Button>
          </>
        )}
        <Button variant="outline" onClick={() => { setTab(tab === "rincian" ? "riwayat" : "rincian"); setSelBatch(null); }}>
          {tab === "rincian" ? (
            <><CheckCircle2 className="mr-1.5 size-4" />Disahkan</>
          ) : (
            <><Hourglass className="mr-1.5 size-4" />Belum Disahkan</>
          )}
        </Button>
      </div>

      {/* Tabel utama (untuk disahkan) — hanya di tab rincian */}
      {tab === "rincian" && (
      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h3 className="text-sm font-bold">Rincian Pendapatan untuk Disahkan (masuk DIPA)</h3>
            <p className="text-xs text-muted-foreground">Menampilkan {shown.length} dari {filtered.length} · centang untuk memilih</p>
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
                <TableHead>Jenis Tagihan</TableHead>
                <TableHead>Pembayar</TableHead>
                <TableHead className="text-right">Nominal</TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <CheckBox checked={allSelected} onClick={toggleAll} />
                    <span className="text-[11px]">Semua</span>
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.length ? shown.map((t) => (
                <TableRow key={t.id} className={cn(selected.has(t.id) && "bg-emerald-50 dark:bg-emerald-950/30")}>
                  <TableCell className="font-mono text-xs">{pad(t.day)}/{pad(t.m + 1)}/{t.y}</TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-[11px]">{idTrx(t)}</TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-[11px]">{noVA(t)}</TableCell>
                  <TableCell>{SERVICE_MAP[t.key].name}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground" title={rincianOf(t).map((x) => x.jenis).join(", ")}>{rincianOf(t).map((x) => x.jenis).join(", ")}</TableCell>
                  <TableCell>{t.payer}{t.prodi ? ` · ${t.prodi}` : ""}</TableCell>
                  <TableCell className="text-right tabular-nums">{rupiah(t.amount)}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center"><CheckBox checked={selected.has(t.id)} onClick={() => toggle(t.id)} /></div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">Tidak ada pendapatan untuk disahkan pada filter ini.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between border-t bg-muted/40 px-5 py-3 text-sm">
          <span className="font-semibold">Total (sesuai filter)</span>
          <span className="font-bold tabular-nums">{rupiah(total)}</span>
        </div>
      </Card>
      )}

      {/* Riwayat Pengesahan — hanya di tab riwayat */}
      {tab === "riwayat" && (selBatch ? (
      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <Button variant="ghost" size="sm" className="-ml-2 h-8" onClick={() => setSelBatch(null)}>
              <ArrowLeft className="mr-1 size-4" />Kembali ke Riwayat
            </Button>
            <h3 className="mt-1 text-sm font-bold">Rincian Pengesahan — {selBatch.nama}</h3>
            <p className="text-xs text-muted-foreground">
              {selBatch.nomor ? `${selBatch.nomor} · ` : ""}{fmtTgl(selBatch.tanggal)} · {selBatch.trxIds.length} transaksi{selBatch.keterangan ? ` · ${selBatch.keterangan}` : ""}
            </p>
          </div>
          <Badge variant="secondary">{selBatch.trxIds.length} transaksi</Badge>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Layanan</TableHead>
                <TableHead>Pembayar</TableHead>
                <TableHead className="text-right">Nominal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batchTrx.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-xs">{pad(t.day)}/{pad(t.m + 1)}/{t.y}</TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-[11px]">{idTrx(t)}</TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-[11px]">{noVA(t)}</TableCell>
                  <TableCell>{SERVICE_MAP[t.key].name}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground" title={rincianOf(t).map((x) => x.jenis).join(", ")}>{rincianOf(t).map((x) => x.jenis).join(", ")}</TableCell>
                  <TableCell>{t.payer}{t.prodi ? ` · ${t.prodi}` : ""}</TableCell>
                  <TableCell className="text-right tabular-nums">{rupiah(t.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between border-t bg-muted/40 px-5 py-3 text-sm">
          <span className="font-semibold">Total Disahkan</span>
          <span className="font-bold tabular-nums text-sky-700">{rupiah(selBatch.total)}</span>
        </div>
      </Card>
      ) : (
      <>
      <DisahkanAkun />

      <Card className="overflow-hidden p-0">
        <div className="border-b px-5 py-4">
          <h3 className="text-sm font-bold">Riwayat Pengesahan</h3>
          <p className="text-xs text-muted-foreground">Arsip pengesahan yang telah dibuat · klik “Lihat” untuk rincian</p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Pengesahan</TableHead>
                <TableHead>Nomor</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.length ? batches.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.nama}</TableCell>
                  <TableCell className="font-mono text-xs">{b.nomor || "—"}</TableCell>
                  <TableCell>{fmtTgl(b.tanggal)}</TableCell>
                  <TableCell className="text-right tabular-nums">{b.trxIds.length}</TableCell>
                  <TableCell className="text-right tabular-nums">{rupiah(b.total)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-8" onClick={() => setSelBatch(b)}><Eye className="mr-1 size-4" />Lihat</Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Belum ada pengesahan.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
      </>

      ))}

      {/* Modal form pengesahan */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sahkan Pendapatan ke DIPA</DialogTitle>
            <DialogDescription>{selected.size} transaksi · {rupiah(selectedTotal)}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Field label="Nama Pengesahan">
              <Input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="mis. Pengesahan Pendapatan BLU September 2026" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nomor Dokumen">
                <Input value={nomor} onChange={(e) => setNomor(e.target.value)} placeholder="mis. SP3B-01/2026" />
              </Field>
              <Field label="Tanggal Pengesahan">
                <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
              </Field>
            </div>
            <Field label="Keterangan">
              <textarea value={keterangan} onChange={(e) => setKeterangan(e.target.value)} rows={2}
                placeholder="Catatan tambahan (opsional)"
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </Field>
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-snug text-amber-700 dark:bg-amber-950/40">
              Setelah disahkan, transaksi ini tidak lagi tampil di Dana Kelola maupun daftar Pengesahan, dan tersimpan sebagai arsip di Riwayat Pengesahan.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Batal</Button>
            <Button onClick={submitSahkan} disabled={!nama.trim()}><Check className="mr-1.5 size-4" />Sahkan Sekarang</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </div>
  );
}

function SummaryCard({
  color, Icon, title, value, sub, valueClass,
}: {
  color: string; Icon: React.ComponentType<{ className?: string }>; title: string; value: string; sub: string; valueClass?: string;
}) {
  return (
    <Card className="relative overflow-hidden p-5">
      <span className="absolute inset-x-0 top-0 h-1" style={{ background: color }} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className={cn("mt-1 text-2xl font-extrabold tabular-nums", valueClass)}>{value}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
        </div>
        <div className="grid size-11 place-items-center rounded-xl" style={{ background: `${color}22`, color }}>
          <Icon className="size-5" />
        </div>
      </div>
    </Card>
  );
}

function CheckBox({ checked, onClick }: { checked: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label="Pilih"
      className={cn("grid size-5 place-items-center rounded border transition-colors",
        checked ? "border-emerald-600 bg-emerald-600 text-white" : "border-input hover:border-emerald-600")}>
      {checked && <Check className="size-3.5" />}
    </button>
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
