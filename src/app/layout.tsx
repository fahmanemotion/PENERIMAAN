import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/shell/theme";

export const metadata: Metadata = {
  title: "NAVI CAMPUS — Portal Keuangan PIP Makassar",
  description: "Portal penerimaan pendapatan layanan PIP Makassar",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
