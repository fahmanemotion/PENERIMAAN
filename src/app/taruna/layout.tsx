import { TarunaShell } from "@/components/shell/taruna-shell";
export default function TarunaLayout({ children }: { children: React.ReactNode }) {
  return <TarunaShell>{children}</TarunaShell>;
}
