import { CalendarDays, Compass, Layers, LayoutGrid, Settings, TrendingUp, type LucideIcon } from "lucide-react";

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
  { href: "/explorer", label: "Explorer", icon: Compass },
  { href: "/progress", label: "Progress", icon: TrendingUp, soon: true },
];

export const FOOTER_NAV: NavItem[] = [{ href: "/settings", label: "Settings", icon: Settings, soon: true }];

export function titleFor(pathname: string) {
  if (pathname === "/profile") return "Profile";
  if (pathname === "/workout") return "Workout";
  if (pathname.startsWith("/programs/new") || pathname.endsWith("/edit")) return "Program builder";
  if (pathname.startsWith("/programs/")) return "Program";
  const item = [...MAIN_NAV, ...FOOTER_NAV].find((n) => n.href !== "/" && pathname.startsWith(n.href));
  return item?.label ?? "Home";
}
