import { TAGIHAN } from "@/data/mock";
import { PRODI_CODE } from "@/lib/constants";

export const CURRENT_TARUNA_KEY = "portal-current-taruna";

export type TarunaProfile = { nit: string; nama: string; prodi: string; sem: number };
export type TarunaBill = { id: string; sem: number; jenis: string; nominal: number; lunas: boolean };

const NIT_SET = new Set(TAGIHAN.map((t) => t.nit));
export function isTarunaNit(nit: string): boolean { return NIT_SET.has(nit.trim()); }

export function getCurrentNit(): string {
  if (typeof window === "undefined") return "24N101";
  try { return localStorage.getItem(CURRENT_TARUNA_KEY) || "24N101"; } catch { return "24N101"; }
}

// Profil taruna dari NIT (via data tagihan, atau diturunkan dari pola NIT)
export function resolveTaruna(nit: string): TarunaProfile {
  const found = TAGIHAN.find((t) => t.nit === nit);
  if (found) return { nit, nama: found.nama, prodi: found.prodi, sem: found.sem };
  const angkatan = Number(nit.slice(0, 2)) || 24;
  const code = nit.slice(2, 3);
  const entry = Object.entries(PRODI_CODE).find(([, c]) => c === code);
  const prodi = entry ? entry[0] : "DIV Nautika";
  const sem = angkatan >= 25 ? 2 : angkatan === 24 ? 4 : 6;
  return { nit, nama: `Taruna ${nit}`, prodi, sem };
}

function hash(s: string) { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry32(a: number) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// Seluruh tagihan taruna selama pendidikan (semester 1..sem sekarang) — deterministik per NIT.
export function buildBills(p: TarunaProfile): TarunaBill[] {
  const rnd = mulberry32(hash(p.nit));
  const out: TarunaBill[] = [];
  let id = 1;
  for (let sem = 1; sem <= p.sem; sem++) {
    const items: [string, number][] = [[`SPP Semester ${sem}`, 4200000]];
    if (rnd() < 0.95) items.push(["Biaya Asrama", 1500000]);
    if (rnd() < 0.9) items.push(["Permakanan", 1490000]);
    if (sem % 2 === 1 && rnd() < 0.75) items.push(["Biaya Praktik Laut", 3500000]);
    if (rnd() < 0.6) items.push(["Biaya Kegiatan Taruna", 900000]);
    if (sem === 1) items.push(["Biaya Seragam", 1800000]);
    if (rnd() < 0.5) items.push(["Biaya Kesehatan", 600000]);
    for (const [jenis, nominal] of items) {
      const lunas = sem < p.sem ? true : rnd() < 0.45; // semester lalu lunas; semester berjalan campur
      out.push({ id: `${p.nit}-${id++}`, sem, jenis, nominal, lunas });
    }
  }
  const cur = out.filter((b) => b.sem === p.sem);
  if (cur.length && cur.every((b) => b.lunas)) cur[0].lunas = false;
  return out;
}
