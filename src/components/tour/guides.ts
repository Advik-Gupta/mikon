import type { GuideStep } from "./Guide";

export const GUIDES = {
  home: [
    { target: "home-checklist", title: "Your getting started list", body: "A few things worth trying. Do them in any order, they tick off on their own. Hide the list whenever you like." },
    { target: "home-insights", title: "Your week at a glance", body: "Streak, recent sets, weigh-ins and training days. Tap any card to dig in." },
    { target: "train", place: "right", title: "Train any time", body: "Start an empty workout, today's session from your program, or repeat one you've done before." },
    { target: "nav", place: "right", title: "Everything else lives here", body: "History, body tracking and more. Tips pop up the first time you open a new page." },
  ],
  explorer: [
    { target: "explorer-figure", place: "right", title: "Tap any muscle", body: "See what it does and the exercises that hit it. Flip to the back with the toggle." },
    { target: "explorer-tabs", title: "Browse exercises", body: "Switch to the exercise library to search over 900 movements and add your own." },
  ],
  profile: [
    { target: "profile-photo", title: "Make it yours", body: "Tap your picture to add a photo. Friends see it on your profile and in comparisons." },
    { target: "profile-edit", title: "Your details", body: "Body stats, goals, schedule and injuries. Programs adapt when these change." },
    { target: "profile-share", title: "Share and invite", body: "Make a card with your best lifts and split, or send friends an invite link." },
  ],
  friends: [
    { target: "friends-tabs", title: "Friends and requests", body: "Your friends, requests waiting for you, and a tab to find people." },
    { target: "friends-find", title: "Find your people", body: "Search by username. Once you're friends you can compare lifts and share programs." },
  ],
  programs: [
    { target: "programs-open", title: "Open a program", body: "See the full plan, start it, share it or keep editing." },
    { target: "programs-new", title: "Build another", body: "Make as many as you like. Only one runs at a time." },
  ],
  program: [
    { target: "program-start", title: "Start the program", body: "Pick a start date and Mikon shows today's session on Home and in the start sheet." },
    { target: "program-share", title: "Share it", body: "Send it to friends or make it public. They can copy it into their own programs." },
  ],
  history: [
    { target: "history-item", title: "Every workout you've done", body: "Open one to see sets and PRs, share it as an image, or repeat it." },
    { target: "history-start", title: "Start from here too", body: "Begin a new workout without going back to Home." },
  ],
  body: [
    { target: "body-add", place: "left", title: "Quick log", body: "Tap plus to add today's value. Weigh in a few times a week for a smooth trend." },
    { target: "body-metric", title: "See the trend", body: "Tap a row for its chart, moving average and every entry." },
  ],
  metric: [
    { target: "metric-range", title: "Zoom in or out", body: "Change the range to spot short swings or the long term trend." },
    { target: "metric-add", title: "Add or fix entries", body: "Log a new value, or tap any entry below to change it." },
  ],
} satisfies Record<string, GuideStep[]>;
