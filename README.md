<h2 align="center">Mikon</h2>
<br/>

> An in depth training platform for building programs across weightlifting, calisthenics, plyometrics, cardio and sport, with fatigue and volume tracked on every muscle as you plan.

## ⚙️ Tech Stack

**App**

- [Next.js](https://nextjs.org/) (App Router)
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Motion](https://motion.dev/) (animation)
- [dnd kit](https://dndkit.com/) (drag and drop)
- [Lucide](https://lucide.dev/) (icons)

**Backend**

- [MongoDB](https://www.mongodb.com/) with the official Node driver
- [jose](https://github.com/panva/jose) (JWT sessions) and [bcrypt](https://github.com/dcodeIO/bcrypt.js) (password hashing)
- [Zod](https://zod.dev/) (request validation)
- [UploadThing](https://uploadthing.com/) (profile photos)
- [web-push](https://github.com/web-push-libs/web-push) (push notifications)
- [Nodemailer](https://nodemailer.com/) (password reset emails)

## 🔧 Features

- **Secure Accounts**
  Email or username sign in with hashed passwords, httpOnly JWT sessions, emailed password reset links, rate limited auth, validated requests and strict security headers.

- **In Depth Onboarding**
  Contact details, body metrics, body fat estimate, an injury body map, experience and PRs, training disciplines, ranked goals and a weekly availability calendar.

- **Guided Tour**
  A short walkthrough after signup that visits the board, profile, explorer and friends and ends at creating your first program. New features get a short what's new tour, and the builder shows a few quick tips the first time.

- **Muscle and Exercise Explorer**
  Interactive male and female body maps with zoomable muscle groups, anatomy for every muscle, and a library of 900+ exercises you can extend with your own.

- **Program Builder**
  Tiered goals, measurable targets and a weekly, two week or custom cycle, laid out on a drag and drop board of days and activity blocks.

- **Activity Editors**
  Dedicated builders for lifting sets and techniques, calisthenics progressions and holds, plyometric contacts, mobility, cardio segments with zones and intervals, and sport sessions.

- **Fatigue and Volume Tracking**
  Every activity converts to set equivalents per muscle, with day by day recovery, a full cycle heatmap, a body overview and weekly volume targets.

- **Smart Suggestions**
  Toast advice when a change stacks activities on the same muscles, overloads a muscle in one session or skips a recovery day.

- **Program Overview**
  Save a finished program and analyse it day by day or across the week, with a heat mapped muscle figure, weekly volume, a load map and targets.

- **Daily Training**
  Start a program on any date and the home board shows each day's session.

- **Workout Tracker**
  A phone first logger in the spirit of Strong and MacroFactor: start today's session, any program day, a past workout or an empty one. Custom keypad with reps in reserve, previous numbers, warm ups, swaps, notes, rest timers that survive leaving the app, minimize to keep browsing, and a summary with new bests.

- **Workout History**
  Every logged session with a consistency heatmap, full set details and per exercise history.

- **Friends and Sharing**
  Search people by username, send friend requests, see each other's active programs, share programs or list them on your public profile. Invite links (WhatsApp, share sheet or copy) make you friends with whoever joins.

- **Progress Comparisons**
  Every exercise has a page with your progress chart and a friends leaderboard, plus head to head charts on a friend's profile.

- **Privacy Controls**
  Choose who sees your profile, active program and progress: everyone, friends or only you.

- **Installable App**
  A full PWA with offline fallback, an install prompt, push notifications and phone first layouts.

## 🚀 Getting Started

```bash
npm install
cp .env.example .env.local
npm run db:seed
npm run dev
```

Fill in `.env.local` with your MongoDB connection string, a long random `JWT_SECRET`, an UploadThing token, SMTP details for reset emails and VAPID keys (`npx web-push generate-vapid-keys`) before seeding. `npm run db:seed` loads the exercise library into MongoDB.

Exercise photos and instructions come from [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (public domain). Body figure paths come from [react-native-body-highlighter](https://github.com/HichamELBSI/react-native-body-highlighter) (MIT).

## 🚀 Made with ❤️ by

<table>
<tr align="center">
<td>
	<p align="center">
		<img src="https://github.com/Advik-Gupta.png" width="170" height="170" alt="Advik Gupta" style="border: 2px solid grey; border-radius: 50%;">
	</p>
	<p style="font-size:17px; font-weight:600;">Advik Gupta</p>
	<p align="center">
		<a href="https://github.com/Advik-Gupta">
			<img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub"/>
		</a>
	</p>
</td>
</tr>
</table>
