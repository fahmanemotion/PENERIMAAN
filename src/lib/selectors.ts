import { TRX } from "@/data/mock";
import { SERVICES } from "@/lib/constants";
import type { Trx, ServiceKey } from "@/types";

export interface TrxFilter {
  year: number;
  month: number | "all";
  day: number | "all";
}

export function filterTrx(f: TrxFilter): Trx[] {
  return TRX.filter((t) => {
    if (t.y !== f.year) return false;
    if (f.month !== "all" && t.m !== f.month) return false;
    if (f.day !== "all" && t.day !== f.day) return false;
    return true;
  });
}

export function sumByService(list: Trx[]): Record<ServiceKey, number> {
  const o = Object.fromEntries(SERVICES.map((s) => [s.key, 0])) as Record<
    ServiceKey,
    number
  >;
  for (const t of list) o[t.key] += t.amount;
  return o;
}
