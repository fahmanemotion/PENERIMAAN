"use client";

import * as React from "react";
import { Plus, Pencil, Trash2, Users, Save } from "lucide-react";
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
import { PRODI } from "@/lib/constants";
import type { Prodi } from "@/types";

type Role = "admin" | "keuangan" | "pimpinan" | "taruna";
type User = { id: string; nama: string; username: string; role: Role; prodi: string; sem: number; aktif: boolean };

const ROLES: { key: Role; label: string; color: string }[] = [
  { key: "admin", label: "Administrator", color: "#6d28d9" },
  { key: "keuangan", label: "Keuangan", color: "#0f766e" },
  { key: "pimpinan", label: "Pimpinan", color: "#b45309" },
  { key: "taruna", label: "Taruna", color: "#12599e" },
];
const roleMeta = (r: Role) => ROLES.find((x) => x.key === r)!;
const STORE_KEY = "portal-pengguna-v1";
const uid = () => `u-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

function u(nama: string, username: string, role: Role, prodi = "", sem = 0, aktif = true): User {
  return { id: uid(), nama, username, role, prodi, sem, aktif };
}
const DEFAULTS: User[] = [
  u("Administrator Sistem", "admin", "admin"),
  u("Johansyah Fahhar", "fahman.keu", "keuangan"),
  u("Staf Keuangan", "staf.keu", "keuangan"),
  u("Direktur PIP Makassar", "direktur", "pimpinan"),
  u("Wakil Direktur I", "wadir1", "pimpinan"),
  u("Andi Saputra", "24N101", "taruna", "DIV Nautika", 5),
  u("Siti Rahmah", "24T102", "taruna", "DIV Teknika", 3),
  u("Bayu Segara", "23K103", "taruna", "DIV KALK", 7),
  u("Reza Fahlevi", "25E104", "taruna", "DPIII ETO", 2),
  u("Muh. Ilham", "24N205", "taruna", "DIV Nautika", 5),
];

const empty = () => ({ nama: "", username: "", prodi: PRODI[0] as string, sem: 1, aktif: true });

export function PenggunaView() {
  const [role, setRole] = React.useState<Role>("admin");
  const [fProdi, setFProdi] = React.useState<string>("all");
  const [fSem, setFSem] = React.useState<number | "all">("all");
  const [users, setUsers] = React.useState<User[]>(DEFAULTS);
  const [dialog, setDialog] = React.useState<null | { mode: "add" | "edit"; item?: User }>(null);
  const [form, setForm] = React.useState(empty());
  const [del, setDel] = React.useState<User | null>(null);

  React.useEffect(() => {
    try { const raw = localStorage.getItem(STORE_KEY); if (raw) setUsers(JSON.parse(raw)); } catch { /* ignore */ }
  }, []);
  function persist(list: User[]) {
    setUsers(list);
    try { localStorage.setItem(STORE_KEY, JSON.stringify(list)); } catch { /* ignore */ }
  }

  const isTaruna = role === "taruna";
  const list = users.filter((x) => x.role === role
    && (!isTaruna || ((fProdi === "all" || x.prodi === fProdi) && (fSem === "all" || x.sem === fSem))));
  const meta = roleMeta(role);

  function openAdd() { setForm(empty()); setDialog({ mode: "add" }); }
  function openEdit(it: User) {
    setForm({ nama: it.nama, username: it.username, prodi: it.prodi || (PRODI[0] as string), sem: it.sem || 1, aktif: it.aktif });
    setDialog({ mode: "edit", item: it });
  }
  function saveForm() {
    const nama = form.nama.trim(); const username = form.username.trim();
    if (!nama || !username) return;
    const base = { nama, username, role, aktif: form.aktif, prodi: isTaruna ? form.prodi : "", sem: isTaruna ? form.sem : 0 };
    if (dialog?.mode === "add") persist([...users, { id: uid(), ...base }]);
    else if (dialog?.mode === "edit" && dialog.item) {
      const id = dialog.item.id;
      persist(users.map((x) => (x.id === id ? { ...x, ...base } : x)));
    }
    setDialog(null);
  }
  function confirmDelete() {
    if (!del) return;
    persist(users.filter((x) => x.id !== del.id));
    setDel(null);
  }

  return (
    <div className="space-y-5">
      {/* Filter role (+ prodi/semester utk taruna) + tambah */}
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Role">
          <Select value={role} onValueChange={(v) => { setRole(v as Role); setFProdi("all"); setFSem("all"); }}>
            <SelectTrigger className="w-52">
              <span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: meta.color }} />{meta.label}</span>
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r.key} value={r.key}>
                  <span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: r.color }} />{r.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {isTaruna && (
          <>
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
          </>
        )}

        <div className="ml-auto">
          <Button onClick={openAdd}><Plus className="mr-1.5 size-4" />Tambah Pengguna</Button>
        </div>
      </div>

      {/* Tabel per role */}
      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold">
              <span className="size-2.5 rounded-full" style={{ background: meta.color }} />
              <Users className="size-4" /> Pengguna — {meta.label}
            </h3>
            <p className="text-xs text-muted-foreground">{isTaruna ? "Akun taruna, dapat disaring per prodi & semester" : "Akun staf dengan peran ini"}</p>
          </div>
          <Badge variant="secondary">{list.length} akun</Badge>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {isTaruna ? (
                <TableRow>
                  <TableHead className="w-12">NO</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>NIT / Username</TableHead>
                  <TableHead>Prodi</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              ) : (
                <TableRow>
                  <TableHead className="w-12">NO</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              )}
            </TableHeader>
            <TableBody>
              {list.length ? list.map((it, i) => (
                <TableRow key={it.id}>
                  <TableCell className="text-center text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="font-medium">{it.nama}</TableCell>
                  <TableCell className="font-mono text-xs">{it.username}</TableCell>
                  {isTaruna && <TableCell><Badge variant="secondary">{it.prodi}</Badge></TableCell>}
                  {isTaruna && <TableCell>Sem {it.sem}</TableCell>}
                  <TableCell>
                    {it.aktif
                      ? <Badge className="bg-emerald-600 hover:bg-emerald-600">Aktif</Badge>
                      : <Badge variant="outline" className="text-muted-foreground">Nonaktif</Badge>}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="icon" className="size-8" title="Edit" onClick={() => openEdit(it)}><Pencil className="size-4" /></Button>
                      <Button variant="ghost" size="icon" className="size-8 text-rose-600 hover:text-rose-700" title="Hapus" onClick={() => setDel(it)}><Trash2 className="size-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={isTaruna ? 7 : 5} className="py-12 text-center text-muted-foreground">Belum ada pengguna untuk filter ini. Klik <b>Tambah Pengguna</b> untuk menambahkan.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Dialog tambah/edit */}
      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dialog?.mode === "edit" ? "Edit Pengguna" : "Tambah Pengguna"}</DialogTitle>
            <DialogDescription>Role: {meta.label}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Nama Lengkap</label>
              <Input value={form.nama} onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))} placeholder="Nama pengguna" autoFocus />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">{isTaruna ? "NIT / Username" : "Username"}</label>
              <Input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} placeholder={isTaruna ? "mis. 24N101" : "mis. staf.keu"} />
            </div>
            {isTaruna && (
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Program Studi</label>
                  <Select value={form.prodi} onValueChange={(v) => setForm((f) => ({ ...f, prodi: v }))}>
                    <SelectTrigger><span className="truncate">{form.prodi}</span></SelectTrigger>
                    <SelectContent>{PRODI.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Semester</label>
                  <Select value={String(form.sem)} onValueChange={(v) => setForm((f) => ({ ...f, sem: Number(v) }))}>
                    <SelectTrigger><span>Semester {form.sem}</span></SelectTrigger>
                    <SelectContent>{[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (<SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Status</label>
              <Select value={form.aktif ? "1" : "0"} onValueChange={(v) => setForm((f) => ({ ...f, aktif: v === "1" }))}>
                <SelectTrigger><span>{form.aktif ? "Aktif" : "Nonaktif"}</span></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Aktif</SelectItem>
                  <SelectItem value="0">Nonaktif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Batal</Button>
            <Button onClick={saveForm} disabled={!form.nama.trim() || !form.username.trim()}><Save className="mr-1.5 size-4" />Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Konfirmasi hapus */}
      <Dialog open={!!del} onOpenChange={(o) => !o && setDel(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Pengguna?</DialogTitle>
            <DialogDescription>Akun “{del?.nama}” ({del?.username}) akan dihapus.</DialogDescription>
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
