"use client";

import * as React from "react";
import { Eye, ReceiptText, Anchor, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { getCurrentNit, resolveTaruna, buildBills, type TarunaBill, type TarunaProfile } from "@/lib/taruna";
import { rupiah } from "@/lib/format";

const pad = (n: number) => String(n).padStart(2, "0");
function hashId(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
const invNo = (b: TarunaBill) => `INV/PIP/2026/${String((hashId(b.id) % 90000) + 10000)}`;
const tglBayar = (b: TarunaBill) => { const h = hashId(b.id); return `${pad((h % 28) + 1)}/${pad((h % 12) + 1)}/2026`; };

export function TarunaTagihan() {
  const [profile, setProfile] = React.useState<TarunaProfile | null>(null);
  const [bills, setBills] = React.useState<TarunaBill[]>([]);
  const [sem, setSem] = React.useState<number | "all">("all");
  const [invoice, setInvoice] = React.useState<TarunaBill | null>(null);

  React.useEffect(() => {
    const p = resolveTaruna(getCurrentNit());
    setProfile(p); setBills(buildBills(p));
  }, []);

  const semesters = profile ? Array.from({ length: profile.sem }, (_, i) => i + 1) : [];
  const isAll = sem === "all";
  const list = isAll ? bills : bills.filter((b) => b.sem === sem);
  const total = list.reduce((a, b) => a + b.nominal, 0);
  const belum = list.filter((b) => !b.lunas).reduce((a, b) => a + b.nominal, 0);

  return (
    <div className="space-y-5">
      {/* Filter semester */}
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Semester">
          <Select value={String(sem)} onValueChange={(v) => setSem(v === "all" ? "all" : Number(v))}>
            <SelectTrigger className="w-48"><span>{isAll ? "Semua Semester" : `Semester ${sem}`}</span></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Semester</SelectItem>
              {semesters.map((s) => (<SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold"><Wallet className="size-4" /> Tagihan Saya</h3>
            <p className="text-xs text-muted-foreground">{profile?.nama} · {profile?.nit} · {profile?.prodi}{isAll ? " · seluruh semester" : ` · Semester ${sem}`}</p>
          </div>
          <Badge variant="secondary">{list.length} tagihan</Badge>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jenis Tagihan</TableHead>
                {isAll && <TableHead>Semester</TableHead>}
                <TableHead className="text-right">Nominal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.length ? list.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.jenis}</TableCell>
                  {isAll && <TableCell>Sem {b.sem}</TableCell>}
                  <TableCell className="text-right tabular-nums">{rupiah(b.nominal)}</TableCell>
                  <TableCell>
                    {b.lunas
                      ? <Badge className="bg-emerald-600 hover:bg-emerald-600">Lunas</Badge>
                      : <Badge className="bg-amber-600 hover:bg-amber-600">Belum Bayar</Badge>}
                  </TableCell>
                  <TableCell className="text-center">
                    {b.lunas
                      ? <Button variant="ghost" size="icon" className="size-8" title="Lihat invoice" onClick={() => setInvoice(b)}><Eye className="size-4" /></Button>
                      : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={isAll ? 5 : 4} className="py-10 text-center text-muted-foreground">Tidak ada tagihan pada semester ini.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between border-t bg-muted/40 px-5 py-3 text-sm">
          <span className="font-semibold">Total Tagihan · Belum Dibayar</span>
          <span className="font-bold tabular-nums">{rupiah(total)} · <span className="text-rose-600">{rupiah(belum)}</span></span>
        </div>
      </Card>

      {/* Invoice / bukti pembayaran */}
      <Dialog open={!!invoice} onOpenChange={(o) => !o && setInvoice(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ReceiptText className="size-5" /> Bukti Pembayaran</DialogTitle>
            <DialogDescription>Invoice tagihan yang telah lunas</DialogDescription>
          </DialogHeader>
          {invoice && profile && (
            <div className="rounded-xl border">
              <div className="flex items-center gap-3 border-b bg-muted/40 px-4 py-3">
                <div className="grid size-10 place-items-center rounded-lg bg-sky-700 text-white"><Anchor className="size-5" /></div>
                <div>
                  <p className="text-sm font-bold leading-tight">Politeknik Ilmu Pelayaran Makassar</p>
                  <p className="text-xs text-muted-foreground">Bukti Pembayaran Resmi</p>
                </div>
              </div>
              <div className="space-y-2.5 px-4 py-4 text-sm">
                <Row k="No. Invoice" v={invNo(invoice)} mono />
                <Row k="Nama" v={profile.nama} />
                <Row k="NIT" v={profile.nit} mono />
                <Row k="Program Studi" v={`${profile.prodi} · Semester ${invoice.sem}`} />
                <div className="my-1 border-t" />
                <Row k="Jenis Tagihan" v={invoice.jenis} />
                <Row k="Tanggal Bayar" v={tglBayar(invoice)} />
                <Row k="Metode" v="Virtual Account BNI" />
                <div className="my-1 border-t" />
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Jumlah Dibayar</span>
                  <span className="text-lg font-extrabold tabular-nums">{rupiah(invoice.nominal)}</span>
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
