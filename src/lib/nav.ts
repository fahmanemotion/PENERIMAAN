import {
  LayoutDashboard, FileText, BarChart3, Tags, Users, Landmark, Stamp, type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tagihan", label: "Tagihan", icon: FileText },
  { href: "/dana-kelola", label: "Dana Kelola", icon: Landmark },
  { href: "/pengesahan", label: "Pengesahan", icon: Stamp },
  { href: "/laporan", label: "Laporan", icon: BarChart3 },
  { href: "/referensi", label: "Referensi", icon: Tags },
  { href: "/pengguna", label: "Pengguna", icon: Users },
];
