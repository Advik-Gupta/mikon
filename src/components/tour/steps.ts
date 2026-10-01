export interface TourStep {
  id: string;
  route: string;
  target?: string;
  place?: "right" | "left" | "top" | "bottom";
  title: string;
  body: string;
  next?: string;
  since?: number;
}

export { TOUR_VERSION } from "@/lib/tour-version";

export const TOUR: TourStep[] = [
  {
    id: "welcome",
    route: "/",
    title: "Welcome to Mikon, {name}",
    body: "A quick one minute look around before you build your first program.",
    next: "Show me",
  },
  {
    id: "board",
    route: "/",
    target: "home-board",
    place: "top",
    title: "Your board",
    body: "Your focus, your week and your body at a glance. Programs you build get pinned here too.",
  },
  {
    id: "nav",
    route: "/",
    target: "nav",
    place: "right",
    title: "Everything lives here",
    body: "Jump between your programs, the explorer and your friends. New areas will appear here as they launch.",
  },
  {
    id: "train",
    route: "/",
    target: "train",
    place: "right",
    title: "Start a workout",
    body: "Tap here any time to train: today's session, any program day, a past workout or an empty one. It keeps saving even if you close the app.",
    since: 3,
  },
  {
    id: "bell",
    route: "/",
    target: "bell",
    place: "bottom",
    title: "Notifications",
    body: "Friend requests and programs shared with you land here. Turn on push notifications from your profile to get them on your phone.",
    since: 2,
  },
  {
    id: "avatar",
    route: "/",
    target: "avatar",
    place: "left",
    title: "Your profile",
    body: "Everything you told us during onboarding. Let's take a look.",
    next: "Open profile",
  },
  {
    id: "profile-stats",
    route: "/profile",
    target: "profile-stats",
    place: "bottom",
    title: "Your numbers",
    body: "Body stats, injuries, goals and schedule. Programs use all of this to keep your training safe and realistic.",
  },
  {
    id: "profile-edit",
    route: "/profile",
    target: "profile-edit",
    place: "left",
    title: "Change anything, anytime",
    body: "Edit any section whenever things change. Your programs adapt to the latest version.",
    next: "Next: Explorer",
  },
  {
    id: "explorer-figure",
    route: "/explorer",
    target: "explorer-figure",
    place: "right",
    title: "Explore your body",
    body: "Click any muscle group to zoom in, then pick a muscle to see what it does and the exercises that train it.",
  },
  {
    id: "explorer-tabs",
    route: "/explorer",
    target: "explorer-tabs",
    place: "bottom",
    title: "Hundreds of exercises",
    body: "Browse the full library with filters, or create your own exercises when something is missing.",
  },
  {
    id: "friends",
    route: "/friends",
    target: "friends-tabs",
    place: "bottom",
    title: "Train with friends",
    body: "Find people by username, send requests and see each other's active programs. You can compare progress on the exercises you share.",
    next: "Last step",
    since: 2,
  },
  {
    id: "new-program",
    route: "/",
    target: "new-program",
    place: "right",
    title: "Build your first program",
    body: "Set your goals, lay out your week and drag in your training. Mikon keeps an eye on volume and fatigue as you go.",
  },
];
