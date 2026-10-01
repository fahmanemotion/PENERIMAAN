import type { Trx, Tagihan, Prodi, ServiceKey } from "@/types";
import {
  SERVICES, YEARS, CUR_YEAR, CUR_MONTH, PRODI, PRODI_CODE,
} from "@/lib/constants";

function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260923);
const ri = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min;
function pick<T>(arr: T[]): T { return arr[Math.floor(rnd() * arr.length)]; }

// Target pendapatan bulanan (5 layanan reguler). SIPENCATAR dibuat terpisah.
const BASE: Partial<Record<ServiceKey, [number, number]>> = {
  taruna: [900e6, 1400e6], penjenjangan: [250e6, 520e6], teknis: [150e6, 360e6],
  rs: [180e6, 330e6], kerjasama: [80e6, 720e6],
  ticketing: [30e6, 90e6], pos: [15e6, 45e6],
};

const NAMES = [
  "Andi Saputra","Muh. Ilham","Rizky Pratama","Nurul Aisyah","Fadel Rahman",
  "Dewi Lestari","Aditya Nugroho","Putra Wijaya","Bagus Setiawan","Yusuf Maulana",
  "Reza Fahlevi","Siti Rahmah","Arif Budiman","Hendra Gunawan","Ayu Wandira",
  "Fitra Ramadhan","Gilang Permana","Ibnu Hajar","Kurniawan","Lukman Hakim",
  "Zulkifli","Rahmat Hidayat","Syahrul Gunawan","Teguh Prasetyo","Wahyu Utomo",
  "Aan Kurnia","Bayu Segara","Dimas Anggara","Eko Prasojo","Fajar Nugraha",
  "Hasbi Ashidiq","Irfan Maulana","Jefri Saputra","Kevin Ananda","Miftah Farid",
  "Naufal Rizki","Oscar Pradana","Pandu Wibowo","Qori Ramadan","Rangga Adi",
];
const PAYER_RS = ["Pasien Umum","BPJS Kesehatan","Rujukan Klinik","MCU Perusahaan","Rawat Inap"];
const PAYER_KS = ["PT Pelindo IV","PT Meratus Line","Dishub Sulsel","PT Salam Pacific","BPSDM Perhubungan","PT Bosowa"];
const PAYER_DK = ["Peserta Mandiri","Instansi Pengirim","Perusahaan Pelayaran"];
const PAYER_TIK = ["Penumpang Umum","Rombongan Instansi","Tiket Reguler","Tiket Grup"];
const PAYER_POS = ["Peserta PUKP","Taruna Prala","Taruna Pra Layar","PASIS ANT/ATT"];

// Tahapan SIPENCATAR (seleksi penerimaan calon taruna) + tarif + rasio funnel.
const SIPENCATAR_STAGES: { nama: string; fee: number; ratio: number }[] = [
  { nama: "Pendaftaran", fee: 135000, ratio: 1 },
  { nama: "Tes Potensi Akademik", fee: 150000, ratio: 1 },
  { nama: "Seleksi Kesehatan Calon Taruna", fee: 850000, ratio: 0.55 * 0.6 },
  { nama: "Seleksi Kesehatan Calon Taruni", fee: 895000, ratio: 0.55 * 0.4 },
  { nama: "Seleksi Kesamaptaan", fee: 79000, ratio: 0.55 },
  { nama: "Seleksi Psikotes", fee: 585000, ratio: 0.35 },
  { nama: "Seleksi Wawancara", fee: 85000, ratio: 0.35 },
];
const WAVE_MONTHS = [1, 4, 7, 10]; // Feb, Mei, Ags, Nov (0-indexed) — 4 gelombang/tahun

function buildTrx(): Trx[] {
  const out: Trx[] = [];
  let id = 1;

  // ── 5 layanan reguler ──
  for (const y of YEARS) {
    const lastMonth = y === CUR_YEAR ? CUR_MONTH : 11;
    const growth = y === 2024 ? 0.82 : y === 2025 ? 0.92 : 1;
    for (let m = 0; m <= lastMonth; m++) {
      for (const s of SERVICES) {
        const base = BASE[s.key];
        if (!base) continue; // lewati SIPENCATAR (dibuat terpisah)
        const [lo, hi] = base;
        const target = (lo + rnd() * (hi - lo)) * growth * (0.85 + rnd() * 0.3);
        const cnt = s.key === "taruna" ? ri(8, 16) : s.key === "rs" ? ri(10, 22) : ri(3, 9);
        let remain = target;
        for (let i = 0; i < cnt; i++) {
          const share = i === cnt - 1 ? remain : (target / cnt) * (0.5 + rnd());
          const amount = Math.max(50000, Math.min(remain, Math.round(share / 1000) * 1000));
          remain -= amount; if (remain < 0) remain = 0;
          let payer: string; let prodi: Prodi | null = null;
          if (s.key === "taruna") { payer = pick(NAMES); prodi = pick(PRODI); }
          else if (s.key === "rs") payer = pick(PAYER_RS);
          else if (s.key === "kerjasama") payer = pick(PAYER_KS);
          else if (s.key === "ticketing") payer = pick(PAYER_TIK);
          else if (s.key === "pos") payer = pick(PAYER_POS);
          else payer = pick(PAYER_DK);
          out.push({ id: id++, y, m, day: ri(1, 28), key: s.key, amount, payer, prodi });
          if (remain <= 0) break;
        }
      }
    }
  }

  // ── SIPENCATAR: 4 gelombang/tahun, tiap tahap satu transaksi (agregat) ──
  for (const y of YEARS) {
    const lastMonth = y === CUR_YEAR ? CUR_MONTH : 11;
    const growth = y === 2024 ? 0.82 : y === 2025 ? 0.92 : 1;
    WAVE_MONTHS.forEach((wm, wi) => {
      if (wm > lastMonth) return;
      const pendaftar = Math.round(ri(950, 1200) * growth); // pendaftar awal per gelombang
      const diterima = ri(250, 265); // yang diterima (info)
      SIPENCATAR_STAGES.forEach((st) => {
        const jumlah = Math.round(pendaftar * st.ratio);
        const amount = jumlah * st.fee;
        out.push({
          id: id++, y, m: wm, day: ri(1, 20), key: "sipencatar", amount,
          payer: `${st.nama} — Gel. ${wi + 1} (${jumlah} peserta)`, prodi: null,
        });
      });
      // catatan jumlah diterima disematkan lewat variabel (tidak menghasilkan transaksi)
      void diterima;
    });
  }

  return out;
}

const JENIS: { j: string; amt: [number, number] }[] = [
  { j: "SPP", amt: [3500000, 4500000] },
  { j: "Biaya Asrama", amt: [1200000, 1800000] },
  { j: "Biaya Praktik Laut", amt: [2500000, 4000000] },
  { j: "Biaya Kegiatan Taruna", amt: [600000, 1200000] },
  { j: "Biaya Seragam", amt: [1500000, 2200000] },
  { j: "Biaya Kesehatan", amt: [400000, 800000] },
];

function buildTagihan(): Tagihan[] {
  const out: Tagihan[] = []; let id = 1;
  const add = (nit: string, nama: string, prodi: Prodi, sem: number, jenis: string, nominal: number, lunas: boolean) =>
    out.push({ id: id++, nit, nama, prodi, sem, jenis, nominal, lunas });

  add("24N101","Andi Saputra","DIV Nautika",5,"SPP Semester 5",4200000,true);
  add("24N101","Andi Saputra","DIV Nautika",5,"Biaya Asrama",1500000,true);
  add("24N101","Andi Saputra","DIV Nautika",5,"Biaya Praktik Laut",3500000,false);
  add("24N101","Andi Saputra","DIV Nautika",5,"Biaya Kegiatan Taruna",900000,false);
  add("24T102","Siti Rahmah","DIV Teknika",3,"SPP Semester 3",4000000,true);
  add("24T102","Siti Rahmah","DIV Teknika",3,"Biaya Asrama",1500000,false);
  add("24T102","Siti Rahmah","DIV Teknika",3,"Biaya Seragam",1800000,false);
  add("24T102","Siti Rahmah","DIV Teknika",3,"Biaya Kesehatan",600000,false);
  add("23K103","Bayu Segara","DIV KALK",7,"SPP Semester 7",4300000,true);
  add("23K103","Bayu Segara","DIV KALK",7,"Biaya Wisuda",2500000,true);
  add("25E104","Reza Fahlevi","DPIII ETO",2,"SPP Semester 2",3800000,false);
  add("25E104","Reza Fahlevi","DPIII ETO",2,"Biaya Asrama",1400000,false);
  add("25E104","Reza Fahlevi","DPIII ETO",2,"Biaya Seragam",1700000,true);
  add("25E104","Reza Fahlevi","DPIII ETO",2,"Biaya Kesehatan",550000,false);

  let nit = 200; let ni = 0;
  for (const prodi of PRODI) {
    for (let sem = 1; sem <= 8; sem++) {
      const angkatan = 25 - Math.floor((sem - 1) / 3);
      const nama = NAMES[ni % NAMES.length]; ni++;
      const kode = `${angkatan}${PRODI_CODE[prodi]}${nit++}`;
      const pool = [...JENIS]; const n = ri(3, 6);
      const bills: { jenis: string; nominal: number; lunas: boolean }[] = [];
      for (let k = 0; k < n && pool.length; k++) {
        const idx = Math.floor(rnd() * pool.length);
        const jj = pool.splice(idx, 1)[0];
        const nominal = Math.round((jj.amt[0] + rnd() * (jj.amt[1] - jj.amt[0])) / 1000) * 1000;
        const lunas = rnd() < 0.4;
        const jenis = jj.j === "SPP" ? `SPP Semester ${sem}` : jj.j;
        bills.push({ jenis, nominal, lunas });
      }
      if (bills.every((b) => b.lunas)) bills[0].lunas = false;
      for (const b of bills) add(kode, nama, prodi, sem, b.jenis, b.nominal, b.lunas);
    }
  }
  return out;
}

export interface PembayaranItem { jenis: string; nominal: number; }
export interface Pembayaran {
  id: number; y: number; m: number; day: number;
  nit: string; nama: string; prodi: Prodi; sem: number;
  items: PembayaranItem[];
}

function buildPembayaran(): Pembayaran[] {
  const out: Pembayaran[] = []; let id = 1;
  for (let i = 0; i < 60; i++) {
    const prodi = pick(PRODI);
    const angkatan = pick([23, 24, 25]);
    const sem = ri(1, 8);
    const nama = pick(NAMES);
    const nit = `${angkatan}${PRODI_CODE[prodi]}${300 + i}`;
    const y = 2026;
    const m = ri(0, CUR_MONTH);
    const day = ri(1, 28);
    const combined = rnd() < 0.5;
    const pool = [...JENIS];
    const nItems = combined ? ri(2, 3) : 1;
    const items: PembayaranItem[] = [];
    for (let k = 0; k < nItems && pool.length; k++) {
      const idx = Math.floor(rnd() * pool.length);
      const jj = pool.splice(idx, 1)[0];
      const nominal = Math.round((jj.amt[0] + rnd() * (jj.amt[1] - jj.amt[0])) / 1000) * 1000;
      const jenis = jj.j === "SPP" ? `SPP Semester ${sem}` : jj.j;
      items.push({ jenis, nominal });
    }
    out.push({ id: id++, y, m, day, nit, nama, prodi, sem, items });
  }
  return out;
}

export const TRX: Trx[] = buildTrx();
export const TAGIHAN: Tagihan[] = buildTagihan();
export const PEMBAYARAN_TARUNA: Pembayaran[] = buildPembayaran();
