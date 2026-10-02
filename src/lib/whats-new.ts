export interface NewFeature {
  version: number;
  id: string;
  title: string;
  body: string;
  action?: { label: string; href?: string; event?: string };
}

// Add an entry here for every real feature and bump TOUR_VERSION to its version. UI polish and fixes don't belong here.
export const WHATS_NEW: NewFeature[] = [
  {
    version: 4,
    id: "versus",
    title: "VS friends",
    body: "An animated rundown, with music, of who trained more, lifted more and kept the longer streak this month. Share the summary when it ends.",
    action: { label: "Watch it", event: "mikon:versus" },
  },
  {
    version: 4,
    id: "head-to-head",
    title: "Head to head with anyone",
    body: "Open a friend's profile to compare workouts, volume, body weight and every exercise you've both logged. No shared program needed.",
    action: { label: "Open friends", href: "/friends" },
  },
  {
    version: 4,
    id: "friends-list",
    title: "Friend lists",
    body: "Tap the friends count on any profile to see who they train with.",
  },
  {
    version: 4,
    id: "invites",
    title: "Smarter invites",
    body: "Anyone who joins from your link is asked to add you as a friend, and you get told when they sign up.",
    action: { label: "Invite someone", href: "/profile" },
  },
];
