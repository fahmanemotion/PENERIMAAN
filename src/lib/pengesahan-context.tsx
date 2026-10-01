"use client";

import * as React from "react";

export type PengesahanBatch = {
  id: number;
  nama: string;
  nomor: string;
  tanggal: string; // ISO yyyy-mm-dd
  keterangan: string;
  trxIds: number[];
  total: number;
};

type SahkanInput = {
  nama: string;
  nomor: string;
  tanggal: string;
  keterangan: string;
  trxIds: number[];
  total: number;
};

type Ctx = {
  ratified: Set<number>;
  batches: PengesahanBatch[];
  sahkan: (data: SahkanInput) => void;
};

const PengesahanCtx = React.createContext<Ctx | null>(null);

export function PengesahanProvider({ children }: { children: React.ReactNode }) {
  const [ratified, setRatified] = React.useState<Set<number>>(new Set());
  const [batches, setBatches] = React.useState<PengesahanBatch[]>([]);

  const sahkan = React.useCallback((data: SahkanInput) => {
    setRatified((prev) => {
      const next = new Set(prev);
      data.trxIds.forEach((id) => next.add(id));
      return next;
    });
    setBatches((prev) => [{ id: Date.now(), ...data }, ...prev]);
  }, []);

  return (
    <PengesahanCtx.Provider value={{ ratified, batches, sahkan }}>
      {children}
    </PengesahanCtx.Provider>
  );
}

export function usePengesahan() {
  const ctx = React.useContext(PengesahanCtx);
  if (!ctx) throw new Error("usePengesahan harus dipakai di dalam PengesahanProvider");
  return ctx;
}
