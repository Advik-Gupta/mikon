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

## 🔧 Features

- **Secure Accounts**
  Email and password signup with hashed passwords, httpOnly JWT sessions, rate limited auth, validated requests and strict security headers.

- **In Depth Onboarding**
  Contact details, body metrics, body fat estimate, an injury body map, experience and PRs, training disciplines, ranked goals and a weekly availability calendar.

- **Guided Tour**
  A short walkthrough after signup that visits the board, profile and explorer and ends at creating your first program.

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

## 🚀 Getting Started

```bash
npm install
cp .env.example .env.local
npm run db:seed
npm run dev
```

Fill in `.env.local` with your MongoDB connection string and a long random `JWT_SECRET` before seeding. `npm run db:seed` loads the exercise library into MongoDB.

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
