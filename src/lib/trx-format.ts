import type { Trx } from "@/types";

const pad = (n: number, l: number) => String(n).padStart(l, "0");

// ID transaksi unik & konsisten untuk tiap pendapatan aplikasi
export function idTrx(t: Trx): string {
  return `TRX-${t.y}-${pad(t.id, 6)}`;
}

// Nomor Virtual Account (deterministik per transaksi) — prefix 8810 (BNI)
export function noVA(t: Trx): string {
  const h = (Math.imul(t.id, 2654435761) >>> 0).toString().padStart(10, "0").slice(-10);
  return `8810 ${h.slice(0, 5)} ${h.slice(5)}`;
}
