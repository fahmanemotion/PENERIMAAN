import type { ServiceMeta, ServiceKey, Prodi } from "@/types";

export const SERVICES: ServiceMeta[] = [
  { key: "taruna", name: "Taruna", color: "#12599e" },
  { key: "penjenjangan", name: "Diklat Penjenjangan", color: "#0f766e" },
  { key: "teknis", name: "Diklat Teknis", color: "#b45309" },
  { key: "rs", name: "Rumah Sakit", color: "#be123c" },
  { key: "kerjasama", name: "Kerjasama", color: "#6d28d9" },
  { key: "sipencatar", name: "SIPENCATAR", color: "#0891b2" },
  { key: "ticketing", name: "Ticketing", color: "#ea580c" },
  { key: "pos", name: "PUKP", color: "#65a30d" },
];

export const SERVICE_MAP = Object.fromEntries(
  SERVICES.map((s) => [s.key, s]),
) as Record<ServiceKey, ServiceMeta>;

export const MONTHS = [
  "Jan","Feb","Mar","Apr","Mei","Jun","Jul","Ags","Sep","Okt","Nov","Des",
];

export const YEARS = [2026, 2025, 2024];
export const CUR_YEAR = 2026;
export const CUR_MONTH = 8; // s.d. September 2026 (0-indexed)

export const PRODI: Prodi[] = [
  "DIV Nautika",
  "DIV Teknika",
  "DIV KALK",
  "DPIII Nautika",
  "DPIII Teknika",
  "DPIII ETO",
];

// Kode singkat untuk NIT (data contoh).
export const PRODI_CODE: Record<Prodi, string> = {
  "DIV Nautika": "N",
  "DIV Teknika": "T",
  "DIV KALK": "K",
  "DPIII Nautika": "PN",
  "DPIII Teknika": "PT",
  "DPIII ETO": "E",
};
