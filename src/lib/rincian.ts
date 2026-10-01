import type { Trx, ServiceKey } from "@/types";

function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Kandidat jenis tagihan per layanan (untuk memecah satu transaksi jadi rincian).
export const JENIS_POOL: Record<ServiceKey, string[]> = {
  taruna: ["Permakanan", "Asrama", "Pengasuhan", "Air Bersih", "Laundry", "Asuransi Jiwa", "Perlengkapan Taruna", "Modul Pembelajaran", "Pemeriksaan Kesehatan", "Kartu Perpustakaan"],
  penjenjangan: ["ANT II Pra Layar", "ATT II Pra Layar", "ANT III Pra Prala", "BLGT", "GMDSS", "ECDIS", "Pengurusan Dokumen Prala", "Pembekalan Taruna Prala"],
  teknis: ["BOCT", "PSCRB", "ISM CODE", "IMDG CODE", "MC Taruna", "SSO Taruna", "BRM Taruna", "ERM Taruna"],
  rs: ["Pemeriksaan Kesehatan", "Laboratorium", "Rontgen", "Rawat Inap", "Obat & Farmasi", "MCU", "Pemeriksaan Fisik"],
  kerjasama: ["Biaya Kerjasama", "Sewa Fasilitas", "Jasa Pelatihan", "Konsultasi", "Pengujian TRB/KKP"],
  sipencatar: ["Biaya Seleksi"],
  ticketing: ["Penjualan Tiket", "Tiket Rombongan", "Tiket Reguler", "Tiket Event"],
  pos: ["Pra Prala Taruna", "PUKP Pasca Prala Taruna", "PUKP Pra Layar Taruna", "PUKP Penyegaran (Pasca Layar) Taruna", "TRB Taruna", "CETUL Taruna", "Perpanjangan COC/COE dan GMDSS Taruna", "UKP GMDSS Taruna", "UKP Pemutakhiran Manajemen (ANT/ATT 1-5) Taruna", "PUKP ANT/ATT (1-5) PASIS"],
};

export type RincianItem = { jenis: string; nominal: number };

// Pecah satu transaksi menjadi rincian jenis tagihan yang totalnya PAS = t.amount.
export function rincianOf(t: Trx): RincianItem[] {
  // SIPENCATAR: tahap seleksi sudah ada di payer → satu jenis penuh
  if (t.key === "sipencatar") {
    const stage = t.payer.split(" — ")[0].trim();
    return [{ jenis: stage || "Biaya Seleksi", nominal: t.amount }];
  }
  const rnd = mulberry32((t.id * 2654435761) >>> 0);
  const pool = [...JENIS_POOL[t.key]];
  const maxItems = Math.min(pool.length, t.key === "taruna" ? 4 : 3);
  const n = 1 + Math.floor(rnd() * maxItems);
  const chosen: string[] = [];
  for (let i = 0; i < n && pool.length; i++) chosen.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  const weights = chosen.map(() => 0.5 + rnd());
  const wsum = weights.reduce((a, b) => a + b, 0);
  let acc = 0;
  return chosen.map((j, i) => {
    let val: number;
    if (i === chosen.length - 1) val = t.amount - acc; // sisa → total pas
    else { val = Math.floor((t.amount * weights[i]) / wsum / 1000) * 1000; acc += val; }
    return { jenis: j, nominal: val };
  });
}
