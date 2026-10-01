"use client";

import * as React from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { CalendarIcon, Download, Eye, ArrowLeft, Search } from "lucide-react";
import type { DateRange } from "react-day-picker";
import * as XLSX from "xlsx-js-style";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  SERVICES,
  SERVICE_MAP,
  MONTHS,
  YEARS,
  CUR_YEAR,
  CUR_MONTH,
} from "@/lib/constants";
import { TRX } from "@/data/mock";
import { sumByService } from "@/lib/selectors";
import { rupiah } from "@/lib/format";
import { rincianOf } from "@/lib/rincian";
import { idTrx, noVA } from "@/lib/trx-format";
import { AkunRekap } from "@/features/laporan/akun-rekap";
import type { Trx, ServiceKey } from "@/types";

function atStartOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
const pad = (n: number) => String(n).padStart(2, "0");
const tglStr = (t: Trx) => `${pad(t.day)}/${pad(t.m + 1)}/${t.y}`;
const abc = (n: number) => String.fromCharCode(64 + n);

type JAgg = {
  jenis: string;
  jumlah: number;
  total: number;
  contribs: { t: Trx; nominal: number }[];
};
type JGroup = { key: ServiceKey; name: string; color: string; items: JAgg[] };

function downloadWb(ws: unknown, sheetName: string, filename: string) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws as any, sheetName);
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function LaporanView() {
  const [year, setYear] = React.useState<number>(CUR_YEAR);
  const [month, setMonth] = React.useState<number | "all">("all");
  const [range, setRange] = React.useState<DateRange | undefined>(undefined);
  const [svc, setSvc] = React.useState<ServiceKey | "all">("all");
  const [q, setQ] = React.useState("");
  const [selJenis, setSelJenis] = React.useState<{
    groupName: string;
    item: JAgg;
  } | null>(null);

  const inPeriod = React.useCallback(
    (py: number, pm: number, pday: number) => {
      if (py !== year) return false;
      if (month !== "all") return pm === month;
      if (range?.from) {
        const from = atStartOfDay(range.from);
        const to = atStartOfDay(range.to ?? range.from);
        const d = atStartOfDay(new Date(py, pm, pday));
        return d >= from && d <= to;
      }
      return true;
    },
    [year, month, range],
  );

  const list = React.useMemo<Trx[]>(
    () => TRX.filter((t) => inPeriod(t.y, t.m, t.day)),
    [inPeriod],
  );
  const by = sumByService(list);
  const cnt = React.useMemo(() => {
    const o = Object.fromEntries(SERVICES.map((s) => [s.key, 0])) as Record<
      ServiceKey,
      number
    >;
    for (const t of list) o[t.key]++;
    return o;
  }, [list]);
  const rekapServices =
    svc === "all" ? SERVICES : SERVICES.filter((s) => s.key === svc);
  const rekapTotal = rekapServices.reduce((a, s) => a + by[s.key], 0);
  const rekapCount = rekapServices.reduce((a, s) => a + cnt[s.key], 0);

  // ── Rekap Penerimaan per jenis tagihan (turunan transaksi terfilter → total selalu pas) ──
  const rekapList = React.useMemo(
    () => (svc === "all" ? list : list.filter((t) => t.key === svc)),
    [list, svc],
  );
  const rekapAgg = React.useMemo<JGroup[]>(() => {
    const map = new Map<ServiceKey, Map<string, JAgg>>();
    for (const t of rekapList) {
      for (const it of rincianOf(t)) {
        let m = map.get(t.key);
        if (!m) {
          m = new Map();
          map.set(t.key, m);
        }
        let e = m.get(it.jenis);
        if (!e) {
          e = { jenis: it.jenis, jumlah: 0, total: 0, contribs: [] };
          m.set(it.jenis, e);
        }
        e.jumlah += 1;
        e.total += it.nominal;
        e.contribs.push({ t, nominal: it.nominal });
      }
    }
    return SERVICES.filter((s) => map.has(s.key)).map((s) => ({
      key: s.key,
      name: s.name,
      color: s.color,
      items: [...map.get(s.key)!.values()].sort((a, b) => b.total - a.total),
    }));
  }, [rekapList]);

  const grandJumlah = rekapAgg.reduce(
    (a, g) => a + g.items.reduce((x, it) => x + it.jumlah, 0),
    0,
  );
  const grandTotal = rekapAgg.reduce(
    (a, g) => a + g.items.reduce((x, it) => x + it.total, 0),
    0,
  );

  const query = q.trim().toLowerCase();
  const displayGroups = React.useMemo(() => {
    if (!query) return rekapAgg;
    return rekapAgg
      .map((g) => ({
        ...g,
        items: g.items.filter((it) => it.jenis.toLowerCase().includes(query)),
      }))
      .filter((g) => g.items.length > 0);
  }, [rekapAgg, query]);

  const detailRows = React.useMemo(() => {
    if (!selJenis) return [];
    return [...selJenis.item.contribs].sort(
      (a, b) => b.t.m - a.t.m || b.t.day - a.t.day,
    );
  }, [selJenis]);
  const detailShown = detailRows.slice(0, 100);

  const monthItems = MONTHS.map((mn, i) => ({ i, mn })).filter(
    ({ i }) => !(year === CUR_YEAR && i > CUR_MONTH),
  );
  const periodeLabel =
    month !== "all"
      ? `${MONTHS[month]} ${year}`
      : range?.from
        ? `${format(range.from, "d MMM yyyy", { locale: localeId })} – ${format(range.to ?? range.from, "d MMM yyyy", { locale: localeId })}`
        : `Sepanjang tahun ${year}`;
  const svcLabel = svc === "all" ? "Semua Layanan" : SERVICE_MAP[svc].name;

  const border = {
    top: { style: "thin", color: { rgb: "000000" } },
    bottom: { style: "thin", color: { rgb: "000000" } },
    left: { style: "thin", color: { rgb: "000000" } },
    right: { style: "thin", color: { rgb: "000000" } },
  };
  const money = '"Rp"#,##0';

  function unduhRekap() {
    const aoa: (string | number)[][] = [];
    aoa.push(["REKAP PENERIMAAN POLITEKNIK ILMU PELAYARAN MAKASSAR"]);
    aoa.push([
      `PERIODE: ${periodeLabel.toUpperCase()} · ${svcLabel.toUpperCase()}`,
    ]);
    aoa.push([]);
    aoa.push(["NO", "JENIS TAGIHAN", "JUMLAH", "HARGA", "TOTAL"]);
    const kinds: string[] = ["", "", "", "head"];
    displayGroups.forEach((g, gi) => {
      aoa.push([abc(gi + 1), g.name, "", "", ""]);
      kinds.push("group");
      g.items.forEach((it, i) => {
        aoa.push([
          i + 1,
          it.jenis,
          it.jumlah,
          Math.round(it.total / it.jumlah),
          it.total,
        ]);
        kinds.push("item");
      });
      const sj = g.items.reduce((a, it) => a + it.jumlah, 0);
      const st = g.items.reduce((a, it) => a + it.total, 0);
      aoa.push(["JUMLAH", "", sj, "", st]);
      kinds.push("sub");
    });
    const gj = displayGroups.reduce(
      (a, g) => a + g.items.reduce((x, it) => x + it.jumlah, 0),
      0,
    );
    const gt = displayGroups.reduce(
      (a, g) => a + g.items.reduce((x, it) => x + it.total, 0),
      0,
    );
    aoa.push(["TOTAL PENDAPATAN", "", gj, "", gt]);
    kinds.push("total");
    const ws = XLSX.utils.aoa_to_sheet(aoa) as Record<string, any>;
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
    ];
    ws["!cols"] = [
      { wch: 6 },
      { wch: 40 },
      { wch: 10 },
      { wch: 16 },
      { wch: 18 },
    ];
    const set = (r: number, c: number, s: Record<string, unknown>) => {
      const a = XLSX.utils.encode_cell({ r, c });
      if (!ws[a]) ws[a] = { t: "s", v: "" };
      ws[a].s = { ...(ws[a].s || {}), ...s };
    };
    set(0, 0, {
      font: { bold: true, sz: 13 },
      alignment: { horizontal: "center" },
    });
    set(1, 0, {
      font: { bold: true, sz: 11 },
      alignment: { horizontal: "center" },
    });
    kinds.forEach((k, r) => {
      if (k === "head")
        for (let c = 0; c < 5; c++)
          set(r, c, {
            font: { bold: true },
            fill: { patternType: "solid", fgColor: { rgb: "C6E0B4" } },
            alignment: { horizontal: "center" },
            border,
          });
      if (k === "group")
        for (let c = 0; c < 5; c++)
          set(r, c, {
            font: { bold: true },
            fill: { patternType: "solid", fgColor: { rgb: "D9E1F2" } },
            border,
          });
      if (k === "item")
        for (let c = 0; c < 5; c++)
          set(r, c, {
            border,
            alignment: {
              horizontal:
                c === 0
                  ? "center"
                  : c === 2
                    ? "center"
                    : c >= 3
                      ? "right"
                      : "left",
            },
            ...(c >= 3 ? { numFmt: money } : {}),
          });
      if (k === "sub" || k === "total")
        for (let c = 0; c < 5; c++)
          set(r, c, {
            font: { bold: true },
            fill: {
              patternType: "solid",
              fgColor: { rgb: k === "total" ? "FCE4D6" : "F2F2F2" },
            },
            border,
            alignment: {
              horizontal: c === 2 ? "center" : c >= 3 ? "right" : "left",
            },
            ...(c >= 3 ? { numFmt: money } : {}),
          });
    });
    downloadWb(ws, "Rekap Penerimaan", "Rekap-Penerimaan.xlsx");
  }

  function unduhDetail() {
    if (!selJenis) return;
    const rows = detailRows.map((r, i) => [
      i + 1,
      tglStr(r.t),
      idTrx(r.t),
      noVA(r.t),
      r.t.payer + (r.t.prodi ? ` · ${r.t.prodi}` : ""),
      selJenis.item.jenis,
      r.nominal,
    ]);
    const total: (string | number)[] = [
      "",
      "",
      "",
      "",
      "",
      "TOTAL",
      selJenis.item.total,
    ];
    const aoa: (string | number)[][] = [
      ["RINCIAN PENERIMAAN"],
      [selJenis.item.jenis],
      [`${selJenis.groupName} · ${periodeLabel}`],
      [],
      [
        "NO",
        "Tanggal",
        "ID Transaksi",
        "No. VA",
        "Pembayar",
        "Jenis Tagihan",
        "Nominal",
      ],
      ...rows,
      total,
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa) as Record<string, any>;
    ws["!merges"] = [0, 1, 2].map((r) => ({ s: { r, c: 0 }, e: { r, c: 6 } }));
    ws["!cols"] = [
      { wch: 5 },
      { wch: 13 },
      { wch: 16 },
      { wch: 18 },
      { wch: 28 },
      { wch: 26 },
      { wch: 16 },
    ];
    const hr = 4;
    const ds = 5;
    const tr = ds + rows.length;
    const set = (r: number, c: number, s: Record<string, unknown>) => {
      const a = XLSX.utils.encode_cell({ r, c });
      if (!ws[a]) ws[a] = { t: "s", v: "" };
      ws[a].s = { ...(ws[a].s || {}), ...s };
    };
    set(0, 0, {
      font: { bold: true, sz: 13 },
      alignment: { horizontal: "center" },
    });
    set(1, 0, {
      font: { bold: true, sz: 11 },
      alignment: { horizontal: "center" },
    });
    set(2, 0, { alignment: { horizontal: "center" } });
    for (let c = 0; c < 7; c++)
      set(hr, c, {
        font: { bold: true },
        fill: { patternType: "solid", fgColor: { rgb: "C6E0B4" } },
        alignment: { horizontal: "center" },
        border,
      });
    for (let i = 0; i < rows.length; i++)
      for (let c = 0; c < 7; c++)
        set(ds + i, c, {
          border,
          alignment: {
            horizontal:
              c === 0 || c === 1 ? "center" : c === 6 ? "right" : "left",
          },
          ...(c === 6 ? { numFmt: money } : {}),
        });
    for (let c = 0; c < 7; c++)
      set(tr, c, {
        font: { bold: true },
        border,
        alignment: { horizontal: "right" },
        ...(c === 6 ? { numFmt: money } : {}),
      });
    downloadWb(
      ws,
      "Rincian",
      `Rincian-${selJenis.item.jenis.slice(0, 20)}.xlsx`,
    );
  }

  return (
    <div className="space-y-5">
      {/* Total (hero) */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-sky-800 via-sky-700 to-sky-600 p-6 text-white shadow-lg">
        <div className="pointer-events-none absolute -right-8 -top-10 size-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-wider opacity-85">
            Total Penerimaan
          </p>
          <p className="mt-1 text-4xl font-extrabold tracking-tight tabular-nums">
            {rupiah(rekapTotal)}
          </p>
          <p className="mt-1 text-sm opacity-90">
            {periodeLabel} · {svcLabel} · {rekapCount} transaksi
          </p>
        </div>
      </Card>

      {/* Filter */}
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Tahun">
          <Select
            value={String(year)}
            onValueChange={(v) => {
              setYear(Number(v));
              setMonth("all");
              setRange(undefined);
              setSelJenis(null);
            }}
          >
            <SelectTrigger className="w-36">
              <span>Tahun {year}</span>
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  Tahun {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Bulan">
          <Select
            value={month === "all" ? "all" : String(month + 1)}
            onValueChange={(v) => {
              setMonth(v === "all" ? "all" : Number(v) - 1);
              setRange(undefined);
              setSelJenis(null);
            }}
          >
            <SelectTrigger className="w-36">
              <span>{month === "all" ? "Semua Bulan" : MONTHS[month]}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Bulan</SelectItem>
              {monthItems.map(({ i, mn }) => (
                <SelectItem key={i} value={String(i + 1)}>
                  {mn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Rentang Tanggal">
          <Popover>
            <PopoverTrigger
              className={cn(
                "flex h-9 w-64 items-center justify-start gap-2 rounded-md border border-input bg-background px-3 text-left text-sm font-normal shadow-sm transition-colors hover:bg-accent",
                !range?.from && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="size-4" />
              {range?.from ? (
                range.to ? (
                  <>
                    {format(range.from, "d MMM yyyy", { locale: localeId })} –{" "}
                    {format(range.to, "d MMM yyyy", { locale: localeId })}
                  </>
                ) : (
                  format(range.from, "d MMM yyyy", { locale: localeId })
                )
              ) : (
                <span>Pilih tanggal awal &amp; akhir</span>
              )}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                defaultMonth={range?.from ?? new Date(year, 0, 1)}
                selected={range}
                onSelect={(r) => {
                  setRange(r);
                  setMonth("all");
                  setSelJenis(null);
                }}
                numberOfMonths={2}
                locale={localeId}
              />
            </PopoverContent>
          </Popover>
        </Field>
        <Field label="Layanan">
          <Select
            value={svc}
            onValueChange={(v) => {
              setSvc(v as ServiceKey | "all");
              setSelJenis(null);
            }}
          >
            <SelectTrigger className="w-52">
              <span>{svcLabel}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Layanan</SelectItem>
              {SERVICES.map((s) => (
                <SelectItem key={s.key} value={s.key}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Button
          variant="outline"
          onClick={() => {
            setYear(CUR_YEAR);
            setMonth("all");
            setRange(undefined);
            setSvc("all");
            setSelJenis(null);
          }}
        >
          Reset
        </Button>
      </div>

      {/* Rekap per layanan */}
      <Card className="overflow-hidden p-0">
        <div className="border-b px-5 py-4">
          <h3 className="text-sm font-bold">Rekap per Layanan</h3>
          <p className="text-xs text-muted-foreground">
            {periodeLabel} · {svcLabel}
          </p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Layanan</TableHead>
                <TableHead className="text-right">Jumlah Transaksi</TableHead>
                <TableHead className="text-right">Total Penerimaan</TableHead>
                <TableHead className="text-right">Porsi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rekapServices.map((s) => (
                <TableRow key={s.key}>
                  <TableCell>
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ background: s.color }}
                      />
                      {s.name}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {cnt[s.key]}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {rupiah(by[s.key])}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {rekapTotal
                      ? ((by[s.key] / rekapTotal) * 100).toFixed(1)
                      : "0.0"}
                    %
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between border-t bg-muted/40 px-5 py-3 text-sm">
          <span className="font-semibold">Grand Total</span>
          <span className="font-bold tabular-nums">{rupiah(rekapTotal)}</span>
        </div>
      </Card>

      {/* ===== REKAP PENERIMAAN (per jenis tagihan, ikut filter) ===== */}
      {!selJenis ? (
        <Card className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
            <div>
              <h3 className="text-sm font-bold">Rekap Penerimaan</h3>
              <p className="text-xs text-muted-foreground">
                Per jenis tagihan · {periodeLabel} · {svcLabel}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="w-48 pl-8"
                  placeholder="Cari jenis tagihan"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                onClick={unduhRekap}
                disabled={grandTotal === 0}
              >
                <Download className="mr-1.5 size-4" />
                Unduh Excel
              </Button>
            </div>
          </div>
          <div className="space-y-3 p-4">
            {displayGroups.length ? (
              displayGroups.map((g) => {
                const st = g.items.reduce((a, it) => a + it.total, 0);
                return (
                  <div
                    key={g.key}
                    className="overflow-hidden rounded-lg border"
                  >
                    <div className="flex items-center justify-between gap-2 border-b bg-sky-50 px-4 py-2.5 dark:bg-sky-950/30">
                      <span className="inline-flex items-center gap-2 text-sm font-bold text-sky-800 dark:text-sky-300">
                        <span
                          className="size-2.5 rounded-full"
                          style={{ background: g.color }}
                        />
                        {g.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {g.items.length} jenis ·{" "}
                        <span className="font-semibold text-foreground">
                          {rupiah(st)}
                        </span>
                      </span>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto">
                      <table className="w-full table-fixed text-sm">
                        <colgroup>
                          <col style={{ width: 44 }} />
                          <col />
                          <col style={{ width: 92 }} />
                          <col style={{ width: 140 }} />
                          <col style={{ width: 160 }} />
                          <col style={{ width: 92 }} />
                        </colgroup>
                        <thead>
                          <tr className="text-xs text-muted-foreground">
                            <th className="sticky top-0 z-10 border-b bg-muted px-3 py-2 text-center font-medium">
                              NO
                            </th>
                            <th className="sticky top-0 z-10 border-b bg-muted px-3 py-2 text-left font-medium">
                              Jenis Tagihan
                            </th>
                            <th className="sticky top-0 z-10 border-b bg-muted px-3 py-2 text-right font-medium">
                              Jumlah
                            </th>
                            <th className="sticky top-0 z-10 border-b bg-muted px-3 py-2 text-right font-medium">
                              Harga
                            </th>
                            <th className="sticky top-0 z-10 border-b bg-muted px-3 py-2 text-right font-medium">
                              Total
                            </th>
                            <th className="sticky top-0 z-10 border-b bg-muted px-3 py-2 text-center font-medium">
                              Aksi
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {g.items.map((it, i) => (
                            <tr
                              key={it.jenis}
                              className="border-b last:border-0 hover:bg-muted/40"
                            >
                              <td className="px-3 py-2 text-center text-muted-foreground">
                                {i + 1}
                              </td>
                              <td
                                className="truncate px-3 py-2"
                                title={it.jenis}
                              >
                                {it.jenis}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums">
                                {it.jumlah.toLocaleString("id-ID")}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums">
                                {rupiah(Math.round(it.total / it.jumlah))}
                              </td>
                              <td className="px-3 py-2 text-right font-medium tabular-nums">
                                {rupiah(it.total)}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7"
                                  onClick={() =>
                                    setSelJenis({ groupName: g.name, item: it })
                                  }
                                >
                                  <Eye className="mr-1 size-3.5" />
                                  Lihat
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Tidak ada penerimaan pada filter ini.
              </div>
            )}
          </div>
          <div className="flex items-center justify-between border-t bg-primary/10 px-5 py-3 text-sm">
            <span className="font-bold">
              TOTAL PENDAPATAN · {grandJumlah.toLocaleString("id-ID")} item
            </span>
            <span className="font-extrabold tabular-nums">
              {rupiah(grandTotal)}
            </span>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
            <div>
              <Button
                variant="ghost"
                size="sm"
                className="-ml-2 h-8"
                onClick={() => setSelJenis(null)}
              >
                <ArrowLeft className="mr-1 size-4" />
                Kembali ke Rekap
              </Button>
              <h3 className="mt-1 text-sm font-bold">
                Rincian Penerimaan — {selJenis.item.jenis}
              </h3>
              <p className="text-xs text-muted-foreground">
                {selJenis.groupName} ·{" "}
                {selJenis.item.jumlah.toLocaleString("id-ID")} pembayaran ·{" "}
                {periodeLabel}
              </p>
            </div>
            <Button variant="outline" onClick={unduhDetail}>
              <Download className="mr-1.5 size-4" />
              Unduh Excel
            </Button>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">NO</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>ID Transaksi</TableHead>
                  <TableHead>No. VA</TableHead>
                  <TableHead>Pembayar</TableHead>
                  <TableHead>Jenis Tagihan</TableHead>
                  <TableHead className="text-right">Nominal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detailShown.map((r, i) => (
                  <TableRow key={`${r.t.id}-${i}`}>
                    <TableCell className="text-center text-muted-foreground">
                      {i + 1}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {tglStr(r.t)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-[11px]">
                      {idTrx(r.t)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-[11px]">
                      {noVA(r.t)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {r.t.payer}
                      {r.t.prodi ? ` · ${r.t.prodi}` : ""}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {selJenis.item.jenis}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {rupiah(r.nominal)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {detailRows.length > detailShown.length && (
            <div className="border-t px-5 py-2 text-center text-xs text-muted-foreground">
              Menampilkan {detailShown.length} dari {detailRows.length}{" "}
              pembayaran
            </div>
          )}
          <div className="flex items-center justify-between border-t bg-muted/40 px-5 py-3 text-sm">
            <span className="font-semibold">
              Total Penerimaan ({selJenis.item.jenis})
            </span>
            <span className="font-bold tabular-nums">
              {rupiah(selJenis.item.total)}
            </span>
          </div>
        </Card>
      )}

      {/* ===== REKAP PENERIMAAN PER AKUN (424xxx) ===== */}
      {!selJenis && <AkunRekap />}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
