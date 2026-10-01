"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { User, Lock, LogIn, Eye, EyeOff, Anchor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isTarunaNit, CURRENT_TARUNA_KEY } from "@/lib/taruna";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [show, setShow] = React.useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const u = username.trim();
    if (!u) return;
    if (isTarunaNit(u)) {
      try { localStorage.setItem(CURRENT_TARUNA_KEY, u); } catch { /* ignore */ }
      router.push("/taruna/dashboard");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-gradient-to-b from-[#0a2540] via-[#0c3355] to-[#072033] p-4">
      {/* cahaya & kompas */}
      <div className="pointer-events-none absolute -left-24 -top-24 size-80 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="pointer-events-none absolute right-[-10%] top-[10%] size-72 rounded-full bg-teal-400/10 blur-3xl" />
      <Anchor className="pointer-events-none absolute right-6 top-6 size-16 text-white/5" strokeWidth={1.25} />

      {/* ombak bawah */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0">
        <svg viewBox="0 0 1440 220" className="w-full" preserveAspectRatio="none" aria-hidden="true">
          <path fill="#0e3a5f" fillOpacity="0.55" d="M0,120 C240,180 480,60 720,100 C960,140 1200,60 1440,110 L1440,220 L0,220 Z" />
          <path fill="#0f6e56" fillOpacity="0.4" d="M0,150 C300,100 600,190 900,140 C1140,100 1320,170 1440,140 L1440,220 L0,220 Z" />
          <path fill="#22d3ee" fillOpacity="0.18" d="M0,175 C360,145 720,205 1080,165 C1260,145 1380,185 1440,168 L1440,220 L0,220 Z" />
        </svg>
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* brand */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="grid size-16 place-items-center rounded-2xl bg-white/95 shadow-[0_0_40px_-8px_rgba(34,211,238,0.5)] ring-1 ring-white/30">
            <Image src="/logo-pip.png" alt="NAVI CAMPUS" width={64} height={56} className="size-12 object-contain" priority />
          </div>
          <h1 className="mt-3 text-xl font-extrabold tracking-tight text-white">NAVI CAMPUS</h1>
          <p className="text-xs font-medium text-cyan-300/90">Portal Keuangan Layanan Pelayaran · PIP Makassar</p>
        </div>

        {/* kartu kaca */}
        <form onSubmit={submit} className="rounded-2xl border border-white/15 bg-white/95 p-6 shadow-2xl backdrop-blur-xl dark:bg-slate-900/85">
          <div className="mb-4 flex items-center gap-2">
            <span className="h-4 w-1 rounded-full bg-gradient-to-b from-cyan-400 to-teal-500" />
            <div>
              <h2 className="text-base font-bold leading-tight">Selamat datang kembali</h2>
              <p className="text-xs text-muted-foreground">Masuk untuk melanjutkan.</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Username / NIT</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="mis. admin atau 24N101" autoFocus />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Kata Sandi</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input type={show ? "text" : "password"} className="pl-9 pr-9" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                <button type="button" onClick={() => setShow((v) => !v)} aria-label="Tampilkan sandi" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
          </div>

          <Button type="submit" className="mt-5 w-full bg-gradient-to-r from-sky-700 to-teal-600 hover:from-sky-800 hover:to-teal-700" disabled={!username.trim()}>
            <LogIn className="mr-1.5 size-4" />Masuk
          </Button>

          <p className="mt-4 text-center text-[11px] text-muted-foreground">Staf: username bebas · Taruna: gunakan NIT (mis. 24N101)</p>
        </form>

        <p className="mt-5 text-center text-[11px] text-white/50">Prototipe internal · autentikasi contoh</p>
      </div>
    </div>
  );
}
