export type Prodi =
  | "DIV Nautika"
  | "DIV Teknika"
  | "DIV KALK"
  | "DPIII Nautika"
  | "DPIII Teknika"
  | "DPIII ETO";

export type ServiceKey =
  | "taruna"
  | "penjenjangan"
  | "teknis"
  | "rs"
  | "kerjasama"
  | "sipencatar"
  | "ticketing"
  | "pos";

export interface ServiceMeta {
  key: ServiceKey;
  name: string;
  color: string;
}

export interface Trx {
  id: number;
  y: number;
  m: number; // 0-11
  day: number;
  key: ServiceKey;
  amount: number;
  payer: string;
  prodi: Prodi | null;
}

export interface Tagihan {
  id: number;
  nit: string;
  nama: string;
  prodi: Prodi;
  sem: number; // 1-8
  jenis: string;
  nominal: number;
  lunas: boolean;
}
