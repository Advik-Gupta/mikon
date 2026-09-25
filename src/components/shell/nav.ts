import { CalendarDays, Layers, LayoutGrid, Library, Settings, TrendingUp, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  soon?: boolean;
}

export const MAIN_NAV: NavItem[] = [
  { href: "/", label: "Home", icon: LayoutGrid },
  { href: "/programs", label: "Programs", icon: Layers },
  { href: "/calendar", label: "Calendar", icon: CalendarDays, soon: true },
  { href: "/library", label: "Exercise library", icon: Library, soon: true },
  { href: "/progress", label: "Progress", icon: TrendingUp, soon: true },
];

export const FOOTER_NAV: NavItem[] = [{ href: "/settings", label: "Settings", icon: Settings, soon: true }];

export function titleFor(pathname: string) {
  if (pathname === "/profile") return "Profile";
  if (pathname.startsWith("/programs/")) return "Program builder";
  const item = [...MAIN_NAV, ...FOOTER_NAV].find((n) => n.href !== "/" && pathname.startsWith(n.href));
  return item?.label ?? "Home";
}
