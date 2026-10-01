"use client";

import * as React from "react";
import { Plus, Pencil, Trash2, Tags, Save } from "lucide-react";
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
import { SERVICES, SERVICE_MAP, PRODI, PRODI_CODE } from "@/lib/constants";
import { rupiah } from "@/lib/format";
import type { ServiceKey } from "@/types";

type RefItem = { id: string; jenis: string; tarif: number };
const uid = () => `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const fmtNum = (n: number) => (n ? n.toLocaleString("id-ID") : "");
const parseNum = (v: string) => { const d = v.replace(/\D/g, ""); return d === "" ? 0 : Number(d); };

function mk(key: string, arr: [string, number][]): RefItem[] {
  return arr.map(([jenis, tarif], i) => ({ id: `${key}-${i + 1}`, jenis, tarif }));
}

// Default jenis tagihan taruna per semester ({SEM} diganti nomor semester)
const TARUNA_BASE: [string, number][] = [
  ["SPP Semester {SEM}", 4200000],
  ["Biaya Asrama", 1500000],
  ["Biaya Praktik Laut", 3500000],
  ["Biaya Kegiatan Taruna", 900000],
  ["Biaya Seragam", 1800000],
  ["Biaya Kesehatan", 600000],
  ["Permakanan", 1490000],
];

// Default layanan non-taruna
const DEFAULTS: Partial<Record<ServiceKey, RefItem[]>> = {
  penjenjangan: mk("penjenjangan", [
    ["ANT II Pra Layar", 8500000], ["ATT II Pra Layar", 8500000], ["ANT III Pra Prala", 6500000],
    ["BLGT (Basic Latihan)", 2000000], ["GMDSS", 3500000], ["ECDIS", 2500000],
  ]),
  teknis: mk("teknis", [
    ["BOCT", 1500000], ["PSCRB", 1750000], ["ISM CODE", 1250000], ["IMDG CODE", 1600000],
    ["Medical Care (MC)", 1900000], ["Ship Security Officer (SSO)", 1400000],
  ]),
  rs: mk("rs", [
    ["Pemeriksaan Kesehatan Umum", 150000], ["Laboratorium", 250000], ["Rontgen", 200000],
    ["MCU Lengkap", 750000], ["Rawat Inap per Hari", 500000],
  ]),
  kerjasama: mk("kerjasama", [
    ["Sewa Aula", 5000000], ["Sewa Ruang Kelas", 1000000], ["Jasa Pelatihan", 10000000],
    ["Pengujian TRB/KKP", 3000000],
  ]),
  sipencatar: mk("sipencatar", [
    ["Pendaftaran", 135000], ["Tes Potensi Akademik", 150000], ["Seleksi Kesehatan Calon Taruna", 850000],
    ["Seleksi Kesehatan Calon Taruni", 895000], ["Seleksi Kesamaptaan", 79000], ["Seleksi Psikotes", 585000],
    ["Seleksi Wawancara", 85000],
  ]),
  ticketing: mk("ticketing", [
    ["Tiket Reguler", 50000], ["Tiket Rombongan", 40000], ["Tiket Event", 75000], ["Tiket Kunjungan", 60000],
  ]),
  pos: mk("pos", [
    ["Pra Prala Taruna", 1500000], ["PUKP Pasca Prala Taruna", 2000000], ["PUKP Pra Layar Taruna", 2500000],
    ["PUKP Penyegaran (Pasca Layar) Taruna", 1750000], ["TRB Taruna", 3000000], ["CETUL Taruna", 1200000],
    ["Perpanjangan COC/COE dan GMDSS Taruna", 850000], ["UKP GMDSS Taruna", 1500000],
    ["UKP Pemutakhiran Manajemen (ANT/ATT 1-5) Taruna", 3500000], ["PUKP ANT/ATT (1-5) PASIS", 4000000],
  ]),
};

const keyOf = (svc: ServiceKey, prodi: string, sem: number) =>
  svc === "taruna" ? `portal-ref-taruna-${PRODI_CODE[prodi as keyof typeof PRODI_CODE]}-${sem}` : `portal-referensi-${svc}`;

function defaultsFor(svc: ServiceKey, sem: number): RefItem[] {
  if (svc === "taruna") return TARUNA_BASE.map(([j, t], i) => ({ id: `t-${i + 1}`, jenis: j.replace("{SEM}", String(sem)), tarif: t }));
  return DEFAULTS[svc] ?? [];
}

export function ReferensiView() {
  const [svc, setSvc] = React.useState<ServiceKey>("taruna");
  const [prodi, setProdi] = React.useState<string>(PRODI[0]);
  const [sem, setSem] = React.useState<number>(1);
  const [items, setItems] = React.useState<RefItem[]>([]);
  const [dialog, setDialog] = React.useState<null | { mode: "add" | "edit"; item?: RefItem }>(null);
  const [form, setForm] = React.useState<{ jenis: string; tarif: number }>({ jenis: "", tarif: 0 });
  const [del, setDel] = React.useState<RefItem | null>(null);

  const isTaruna = svc === "taruna";

  // muat data sesuai layanan (+ prodi & semester untuk taruna)
  React.useEffect(() => {
    const k = keyOf(svc, prodi, sem);
    let loaded: RefItem[] | null = null;
    try { const raw = localStorage.getItem(k); if (raw) loaded = JSON.parse(raw); } catch { /* ignore */ }
    setItems(loaded ?? defaultsFor(svc, sem));
  }, [svc, prodi, sem]);

  const meta = SERVICE_MAP[svc];

  function persist(list: RefItem[]) {
    setItems(list);
    try { localStorage.setItem(keyOf(svc, prodi, sem), JSON.stringify(list)); } catch { /* ignore */ }
  }
  function openAdd() { setForm({ jenis: "", tarif: 0 }); setDialog({ mode: "add" }); }
  function openEdit(it: RefItem) { setForm({ jenis: it.jenis, tarif: it.tarif }); setDialog({ mode: "edit", item: it }); }
  function saveForm() {
    const jenis = form.jenis.trim();
    if (!jenis) return;
    if (dialog?.mode === "add") persist([...items, { id: uid(), jenis, tarif: form.tarif }]);
    else if (dialog?.mode === "edit" && dialog.item) {
      const id = dialog.item.id;
      persist(items.map((x) => (x.id === id ? { ...x, jenis, tarif: form.tarif } : x)));
    }
    setDialog(null);
  }
  function confirmDelete() {
    if (!del) return;
    persist(items.filter((x) => x.id !== del.id));
    setDel(null);
  }

  const konteks = isTaruna ? `${prodi} · Semester ${sem}` : "Jenis tagihan & tarif untuk layanan ini";

  return (
    <div className="space-y-5">
      {/* Filter: layanan (+ prodi & semester untuk taruna) + tambah */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Layanan">
            <Select value={svc} onValueChange={(v) => setSvc(v as ServiceKey)}>
              <SelectTrigger className="w-56">
                <span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: meta.color }} />{meta.name}</span>
              </SelectTrigger>
              <SelectContent>
                {SERVICES.map((s) => (
                  <SelectItem key={s.key} value={s.key}>
                    <span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: s.color }} />{s.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {isTaruna && (
            <>
              <Field label="Program Studi">
                <Select value={prodi} onValueChange={(v) => setProdi(v ?? PRODI[0])}>
                  <SelectTrigger className="w-44"><span className="truncate">{prodi}</span></SelectTrigger>
                  <SelectContent>{PRODI.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}</SelectContent>
                </Select>
              </Field>
              <Field label="Semester">
                <Select value={String(sem)} onValueChange={(v) => setSem(Number(v ?? 1))}>
                  <SelectTrigger className="w-40"><span>Semester {sem}</span></SelectTrigger>
                  <SelectContent>{[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (<SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>))}</SelectContent>
                </Select>
              </Field>
            </>
          )}
        </div>
        <Button onClick={openAdd}><Plus className="mr-1.5 size-4" />Tambah Jenis Tagihan</Button>
      </div>

      {/* Tabel referensi */}
      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold">
              <span className="size-2.5 rounded-full" style={{ background: meta.color }} />
              <Tags className="size-4" /> Referensi Tarif — {meta.name}
            </h3>
            <p className="text-xs text-muted-foreground">{konteks}</p>
          </div>
          <div className="flex items-center gap-2">
            {isTaruna && <Badge variant="outline">{prodi} · Sem {sem}</Badge>}
            <Badge variant="secondary">{items.length} jenis</Badge>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">NO</TableHead>
                <TableHead>Jenis Tagihan</TableHead>
                <TableHead className="text-right">Tarif</TableHead>
                <TableHead className="text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length ? items.map((it, i) => (
                <TableRow key={it.id}>
                  <TableCell className="text-center text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="font-medium">{it.jenis}</TableCell>
                  <TableCell className="text-right tabular-nums">{rupiah(it.tarif)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="icon" className="size-8" title="Edit" onClick={() => openEdit(it)}><Pencil className="size-4" /></Button>
                      <Button variant="ghost" size="icon" className="size-8 text-rose-600 hover:text-rose-700" title="Hapus" onClick={() => setDel(it)}><Trash2 className="size-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={4} className="py-12 text-center text-muted-foreground">Belum ada jenis tagihan. Klik <b>Tambah Jenis Tagihan</b> untuk menambahkan.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="border-t bg-muted/30 px-5 py-2 text-[11px] text-muted-foreground">
          {isTaruna
            ? "Tarif taruna disimpan terpisah per Program Studi & Semester. Pilih prodi/semester lain untuk mengelola tarifnya masing-masing."
            : "Data referensi tiap layanan disimpan terpisah di perangkat ini."} Saat backend tersambung, tersimpan di database.
        </div>
      </Card>

      {/* Dialog tambah/edit */}
      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dialog?.mode === "edit" ? "Edit Jenis Tagihan" : "Tambah Jenis Tagihan"}</DialogTitle>
            <DialogDescription>{meta.name}{isTaruna ? ` · ${prodi} · Semester ${sem}` : ""}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Jenis Tagihan</label>
              <Input value={form.jenis} onChange={(e) => setForm((f) => ({ ...f, jenis: e.target.value }))} placeholder="mis. SPP Semester 1" autoFocus />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Tarif (Rp)</label>
              <Input type="text" inputMode="numeric" value={fmtNum(form.tarif)} onChange={(e) => setForm((f) => ({ ...f, tarif: parseNum(e.target.value) }))} placeholder="0" />
              <span className="text-[11px] text-muted-foreground">{rupiah(form.tarif || 0)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Batal</Button>
            <Button onClick={saveForm} disabled={!form.jenis.trim()}><Save className="mr-1.5 size-4" />Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Konfirmasi hapus */}
      <Dialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Jenis Tagihan?</DialogTitle>
            <DialogDescription>“{del?.jenis}” ({del ? rupiah(del.tarif) : ""}) akan dihapus dari referensi {meta.name}{isTaruna ? ` · ${prodi} · Semester ${sem}` : ""}.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDel(null)}>Batal</Button>
            <Button className="bg-rose-600 text-white hover:bg-rose-700" onClick={confirmDelete}><Trash2 className="mr-1.5 size-4" />Hapus</Button>
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
