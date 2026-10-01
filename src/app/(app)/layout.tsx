import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { PengesahanProvider } from "@/lib/pengesahan-context";
import { ManualRevenueProvider } from "@/lib/manual-revenue-context";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PengesahanProvider>
      <ManualRevenueProvider>
        <div className="flex min-h-dvh bg-gradient-to-br from-cyan-50 via-sky-50 to-blue-100 dark:from-[#08172a] dark:via-[#0a2540] dark:to-[#0e3355]">
          <Sidebar />
          <div className="relative flex min-w-0 flex-1 flex-col">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(60rem_20rem_at_100%_-8rem,rgba(34,211,238,0.14),transparent)]" />
            <Topbar />
            <main className="relative mx-auto w-full max-w-[1400px] flex-1 p-4 sm:p-5 lg:p-6 xl:px-8">{children}</main>
          </div>
        </div>
      </ManualRevenueProvider>
    </PengesahanProvider>
  );
}
