"use client";

import * as React from "react";

export type ManualEntry = {
  id: string; y: number; m: number; day: number;
  sumber: string; uraian: string; nominal: number;
};
type Input = Omit<ManualEntry, "id">;
type Ctx = {
  entries: ManualEntry[];
  add: (e: Input) => void;
  update: (id: string, e: Input) => void;
  remove: (id: string) => void;
};

const KEY = "portal-manual-revenue-v1";
const uid = () => `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const C = React.createContext<Ctx | null>(null);

export function ManualRevenueProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = React.useState<ManualEntry[]>([]);

  React.useEffect(() => {
    try { const raw = localStorage.getItem(KEY); if (raw) setEntries(JSON.parse(raw)); } catch { /* ignore */ }
  }, []);

  const persist = (list: ManualEntry[]) => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* ignore */ } };

  const add = React.useCallback((e: Input) => setEntries((prev) => { const next = [{ id: uid(), ...e }, ...prev]; persist(next); return next; }), []);
  const update = React.useCallback((id: string, e: Input) => setEntries((prev) => { const next = prev.map((x) => (x.id === id ? { ...x, ...e } : x)); persist(next); return next; }), []);
  const remove = React.useCallback((id: string) => setEntries((prev) => { const next = prev.filter((x) => x.id !== id); persist(next); return next; }), []);

  return <C.Provider value={{ entries, add, update, remove }}>{children}</C.Provider>;
}

export function useManualRevenue() {
  const c = React.useContext(C);
  if (!c) throw new Error("useManualRevenue harus dipakai di dalam ManualRevenueProvider");
  return c;
}
