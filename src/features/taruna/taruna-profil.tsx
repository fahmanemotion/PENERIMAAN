"use client";

import * as React from "react";
import { Camera, ShieldCheck, IdCard, GraduationCap, Layers } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentNit, resolveTaruna, type TarunaProfile } from "@/lib/taruna";

function initials(nama: string) {
  return nama.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export function TarunaProfil() {
  const [profile, setProfile] = React.useState<TarunaProfile | null>(null);
  React.useEffect(() => { setProfile(resolveTaruna(getCurrentNit())); }, []);

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden p-0">
        {/* Header foto + nama */}
        <div className="relative bg-gradient-to-br from-sky-800 via-sky-700 to-sky-600 px-6 pb-16 pt-8" />
        <div className="px-6 pb-6">
          <div className="-mt-14 flex flex-col items-center text-center sm:flex-row sm:items-end sm:text-left">
            <div className="relative">
              <div className="grid size-28 place-items-center rounded-2xl border-4 border-card bg-slate-200 text-3xl font-extrabold text-slate-500 shadow-lg dark:bg-slate-700 dark:text-slate-300">
                {profile ? initials(profile.nama) : "…"}
              </div>
              <span className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full border-2 border-card bg-muted text-muted-foreground" title="Foto dikelola admin">
                <Camera className="size-4" />
              </span>
            </div>
            <div className="mt-3 sm:mb-1 sm:ml-4">
              <h2 className="text-xl font-extrabold tracking-tight">{profile?.nama ?? "Taruna"}</h2>
              <p className="text-sm text-muted-foreground">{profile?.nit}</p>
            </div>
            <div className="mt-3 sm:mb-1 sm:ml-auto">
              <Badge className="bg-emerald-600 hover:bg-emerald-600"><ShieldCheck className="mr-1 size-3.5" />Aktif</Badge>
            </div>
          </div>

          {/* Data */}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Info Icon={IdCard} label="NIT" value={profile?.nit ?? "—"} mono />
            <Info Icon={GraduationCap} label="Program Studi" value={profile?.prodi ?? "—"} />
            <Info Icon={Layers} label="Semester" value={profile ? `Semester ${profile.sem}` : "—"} note="otomatis via sistem admin" />
            <Info Icon={ShieldCheck} label="Status" value="Aktif" />
          </div>

          <p className="mt-5 rounded-lg bg-muted/50 px-3 py-2 text-[11px] leading-snug text-muted-foreground">
            Data profil (NIT, prodi, semester, status, dan foto) dikelola oleh admin keuangan/akademik. Bila ada ketidaksesuaian, silakan hubungi bagian terkait.
          </p>
        </div>
      </Card>
    </div>
  );
}

function Info({ Icon, label, value, note, mono }: { Icon: React.ComponentType<{ className?: string }>; label: string; value: string; note?: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-3.5">
      <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-sky-700/10 text-sky-700"><Icon className="size-5" /></div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}{note ? <span className="ml-1 text-[10px]">· {note}</span> : null}</p>
        <p className={`truncate font-semibold ${mono ? "font-mono text-sm" : ""}`}>{value}</p>
      </div>
    </div>
  );
}
