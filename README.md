# TechYuva — Institute Management System

Full-stack institute management dashboard for TechYuva coding institute.
- **Frontend**: HTML/CSS/JS (vanilla, no framework)
- **Backend**: Node.js + Express + Firebase Firestore
- **Dashboard**: Student registration, fee tracking, expense management, analytics

---

## 🚀 Quick Start (Local Dev)

### 1. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/project/techyuya/settings/serviceaccounts)
2. Click **"Generate New Private Key"** → download the JSON file
3. Save it as `backend/firebase-key.json`

### 2. Backend

```bash
cd backend
npm install
```

Create `backend/.env`:
```
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-key.json
PORT=3001
```

Start:
```bash
npm start
```

### 3. Frontend

Open `owner.html` in browser. The dashboard loads data from Firestore automatically.

---

## ☁️ Deploy to Vercel

### One-Click Deploy
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

### Manual Steps

1. **Push to GitHub**:
```bash
git add .
git commit -m "feat: Firestore backend + owner dashboard"
git push origin main
```

2. **Import Project** in [Vercel](https://vercel.com/new)

3. **Add Environment Variables** in Vercel Dashboard → Settings:
   - `FIREBASE_SERVICE_ACCOUNT_JSON` → Paste your full Firebase service account JSON as a single line
   - `FIREBASE_PROJECT_ID` → `techyuya`

4. **Deploy** — Vercel auto-detects the config.

---

## 📁 Project Structure

```
Techyuva/
├── owner.html          ← Owner dashboard (admin panel)
├── index.html          ← Landing/home page
├── menu.html           ← Courses listing
├── studyzone.html      ← Student zone
├── style.css           ← All styles
├── script.js           ← Frontend JS
├── vercel.json         ← Vercel deployment config
│
└── backend/
    ├── server.js       ← Express API + Firestore routes
    ├── api/index.js    ← Vercel serverless entry
    ├── package.json
    └── .env            ← Local config
```

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/students` | List all students |
| POST | `/api/students` | Register student |
| PUT | `/api/students/:id` | Update student |
| DELETE | `/api/students/:id` | Delete student |
| POST | `/api/students/:id/payments` | Record payment |
| GET | `/api/courses` | List courses |
| POST | `/api/courses` | Add course |
| PUT | `/api/courses/:id` | Update course |
| DELETE | `/api/courses/:id` | Delete course |
| GET | `/api/expenses` | List expenses |
| POST | `/api/expenses` | Add expense |
| DELETE | `/api/expenses/:id` | Delete expense |
| GET | `/api/dashboard` | Dashboard stats |
| GET | `/api/analytics` | Full analytics data |

## 🛠 Built With

- **Express** — Node.js web framework
- **Firebase Admin SDK** — Firestore database
- **Chart.js** — Data visualizations
- **Vanilla JS** — Zero framework overhead
