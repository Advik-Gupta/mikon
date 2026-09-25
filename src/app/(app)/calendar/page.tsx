import { CalendarDays } from "lucide-react";
import { ComingSoon } from "@/components/shell/ComingSoon";

export default function Page() {
  return <ComingSoon icon={CalendarDays} title="Calendar" text="Your scheduled sessions, deloads and events across every program." />;
}
