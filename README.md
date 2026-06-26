# TechYuva — Online Coding Institute (v2)

An editorial, Awwwards-style website for **TechYuva**, an online
institute teaching **Java · C++ · Python**. Built with vanilla HTML, CSS, and JS
— no frameworks, no build step.

## ✨ Features

- **Live hero terminal** — types real code for each language, "compiles" it, and
  prints friendly output on a loop. Surrounded by a breathing glow orb, rotating
  dashed rings, and floating language chips.
- **Courses** — Java Mastery, C++ Engineering, Python Pro tracks with modules,
  durations, and enroll buttons.
- **Student Zone** — login card + a dashboard preview with animated progress
  bars, XP stats, a live-class indicator, and quick links.
- **Owner Dashboard** — student registration, fee tracking, course reports, and analytics.
- **Study Zone** — career paths, placement prep, job board, study materials, and practice tests.
- **Practice tests** — a full quiz engine with a circular timer, instant
  feedback, and an analysis screen (score donut, time-per-question bar chart,
  per-topic strengths, and full answer review).
- **Polish** — custom cursor, magnetic buttons, scroll reveals, tilt cards,
  grain overlay, marquee, and full `prefers-reduced-motion` support.

## v2 Changes

- Firebase Firestore backend (`backend/server.js`) for persistent data
- Multi-page architecture: index, courses, study zone, owner dashboard
- Vercel deployment with serverless API routes
- Firebase Web SDK on all pages for client-side analytics

## 🚀 Run it

```bash
# Frontend only
python -m http.server 8000
# or open index.html directly

# With backend (requires Firebase service account)
cd backend
npm install
node server.js
```

## 📁 Structure

```
index.html        # landing page
menu.html         # courses page
studyzone.html    # study zone
owner.html        # owner dashboard
style.css         # all styles (tokens, layout, animations)
script.js         # preloader, cursor, quiz engine, analysis, terminal typewriter
api.js            # frontend API client
vercel.json       # Vercel serverless config
backend/
  server.js       # Express + Firebase Admin API
  api/index.js    # Vercel serverless entry
```

## 🔐 Environment Variables (Vercel)

| Name | Description |
|---|---|
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Service account client email |
| `FIREBASE_PRIVATE_KEY` | Service account private key |

## 🎨 Stack

- HTML / CSS / Vanilla JS
- Node.js / Express (backend)
- Firebase Admin SDK + Firestore
- Chart.js (owner dashboard)
- Fonts: Instrument Serif, Space Grotesk, JetBrains Mono (Google Fonts)

---

© 2026 TechYuva
