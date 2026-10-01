import { CalendarDays, Compass, History, Layers, LayoutGrid, Settings, TrendingUp, Users, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  soon?: boolean;
}

export const MAIN_NAV: NavItem[] = [
  { href: "/", label: "Home", icon: LayoutGrid },
  { href: "/programs", label: "Programs", icon: Layers },
  { href: "/explorer", label: "Explorer", icon: Compass },
  { href: "/history", label: "History", icon: History },
  { href: "/friends", label: "Friends", icon: Users },
  { href: "/calendar", label: "Calendar", icon: CalendarDays, soon: true },
  { href: "/progress", label: "Progress", icon: TrendingUp, soon: true },
];

export const FOOTER_NAV: NavItem[] = [{ href: "/settings", label: "Settings", icon: Settings, soon: true }];

export const isImmersive = (pathname: string) => pathname === "/programs/new" || pathname.endsWith("/edit");

export function titleFor(pathname: string) {
  if (pathname === "/profile") return "Profile";
  if (pathname === "/history") return "History";
  if (pathname === "/notifications") return "Notifications";
  if (pathname.startsWith("/exercises/")) return "Exercise";
  if (pathname.startsWith("/u/")) return pathname.includes("/programs/") ? "Program" : "Profile";
  if (pathname.startsWith("/shared/")) return "Shared program";
  if (pathname.startsWith("/programs/new") || pathname.endsWith("/edit")) return "Program builder";
  if (pathname.startsWith("/programs/")) return "Program";
  const item = [...MAIN_NAV, ...FOOTER_NAV].find((n) => n.href !== "/" && pathname.startsWith(n.href));
  return item?.label ?? "Home";
}
