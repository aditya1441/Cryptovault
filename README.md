# 🔐 CryptoVault

> **Track your crypto portfolio like a pro — real-time prices, profit/loss, smart alerts & AI insights.**

CryptoVault is a full-stack web application that lets you track all your cryptocurrency investments in one place. Think of it like a personal finance app, but only for crypto.

---

## 🧒 Explain It Like I'm 5

Imagine you bought some Bitcoin, a little Ethereum, and some Dogecoin. Now you have to open 10 different websites every day to check if you're making money or losing money. That's annoying, right?

**CryptoVault fixes that.**

You tell it what crypto you bought, how much you paid, and when. It then:
- 📈 Shows you **live prices** updated in real-time
- 💰 Tells you if you're **up or down** (profit/loss)
- 🔔 **Alerts you** when a coin hits the price you care about
- 🧠 Uses **AI to give you insights** about your portfolio
- 📊 Shows pretty **charts and graphs** so you can see trends
- 📄 Lets you **download reports** (PDF/CSV) of your trades

---

## ✨ Features

| Feature | What it does |
|---|---|
| 🏠 **Dashboard** | See your total portfolio value, gains/losses, and top holdings at a glance |
| 📊 **Market Page** | Browse live prices for hundreds of cryptocurrencies |
| ➕ **Add Transactions** | Log every buy/sell trade you make |
| 📋 **Transactions History** | Full list of all your trades with filters |
| 🔔 **Price Alerts** | Get notified when BTC hits $100K (or whatever price you set) |
| 🧠 **AI Insights** | Powered by OpenAI — get smart analysis of your portfolio |
| 🎮 **Paper Trading** | Practice trading with fake money — zero risk! |
| 📥 **Reports** | Export your portfolio as PDF or CSV |
| 🔐 **Auth** | Sign up / login with email+password **or** Google OAuth |
| 🌐 **Real-time Sync** | Prices update live via WebSockets (no refresh needed) |

---

## 🏗️ How It's Built

This app has three main parts working together:

```
┌─────────────────────────────────────────────────────┐
│                     YOUR BROWSER                    │
│              React + TypeScript + Tailwind          │
│  (what you see — the pretty UI on localhost:5173)   │
└────────────────────┬────────────────────────────────┘
                     │  HTTP / WebSocket requests
┌────────────────────▼────────────────────────────────┐
│                   FASTAPI BACKEND                   │
│         Python — runs on localhost:8000             │
│  (the brain — handles logic, auth, data fetching)   │
└────────────────────┬────────────────────────────────┘
                     │  SQL queries
┌────────────────────▼────────────────────────────────┐
│                  POSTGRESQL DATABASE                │
│     (the memory — stores users, trades, alerts)     │
└─────────────────────────────────────────────────────┘
```

### Tech Stack

**Frontend**
- ⚛️ React 19 + TypeScript
- 🎨 Tailwind CSS (dark-mode first design)
- 🛣️ React Router v7 (page navigation)
- 📡 Axios (API calls)
- 📊 Recharts (graphs and charts)
- 🎞️ Framer Motion (smooth animations)

**Backend**
- 🐍 Python + FastAPI (fast, modern API framework)
- 🔑 JWT authentication (secure login tokens)
- 🗄️ SQLAlchemy (talks to the database)
- ⏰ APScheduler (runs background jobs, like checking alert prices)
- 🤖 OpenAI API (AI insights feature)
- 📧 FastAPI-Mail (email notifications)

**Infrastructure**
- 🐘 PostgreSQL database
- 🐳 Docker + Docker Compose (run everything with one command)
- 🌐 Nginx (serves the frontend in production)

---

## 🚀 Getting Started

### Option 1 — Docker (Easiest, Recommended)

You only need [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed.

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/cryptovault.git
cd cryptovault

# 2. Copy the environment file and fill in your secrets
cp .env.example .env   # then open .env and edit the values

# 3. Start everything with one command 🚀
docker compose up --build
```

That's it! Open your browser:
- **Frontend →** http://localhost:80
- **API Docs →** http://localhost:8000/docs

---

### Option 2 — Manual Setup (For Developers)

You'll need: **Node.js 18+**, **Python 3.11+**, **PostgreSQL 16**

#### Step 1 — Backend

```bash
cd backend

# Create a virtual environment
python -m venv venv
source venv/bin/activate        # Mac/Linux
# venv\Scripts\activate         # Windows

# Install dependencies
pip install -r requirements.txt

# Set up your .env (copy and edit)
cp .env.example .env

# Start the API server
uvicorn app.main:app --reload
```

Backend is now running at **http://localhost:8000**
Swagger docs at **http://localhost:8000/docs** 🎉

#### Step 2 — Frontend

```bash
cd frontend

# Install dependencies
npm install

# Set up environment
cp .env.example .env    # or just create .env with:
# VITE_API_URL=http://localhost:8000
# VITE_GOOGLE_CLIENT_ID=your_google_client_id

# Start the dev server
npm run dev
```

Frontend is now running at **http://localhost:5173** 🎉

---

## ⚙️ Environment Variables

### Root `.env` (used by Docker Compose)

| Variable | What it is | Example |
|---|---|---|
| `DB_PASSWORD` | Password for PostgreSQL | `my_secure_password` |
| `JWT_SECRET` | Secret key for login tokens (make it long & random!) | `abc123...xyz` |
| `MAIL_EMAIL` | Gmail address for sending alerts | `you@gmail.com` |
| `MAIL_PASSWORD` | Gmail App Password (not your real password!) | `xxxx xxxx xxxx xxxx` |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console (for Google login) | `xxxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console | `GOCSPX-...` |
| `VITE_API_URL` | Where the frontend finds the backend | `http://localhost:8000` |

### `frontend/.env`

```
VITE_API_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
```

### `backend/.env`

```
DATABASE_URL=postgresql+asyncpg://cryptovault:password@localhost:5432/cryptovault
JWT_SECRET=your_super_secret_jwt_key_here
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440
APP_ENV=development
MAIL_EMAIL=your@gmail.com
MAIL_PASSWORD=your_gmail_app_password
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
OPENAI_API_KEY=your_openai_api_key
```

> **How to get a Gmail App Password:**
> Gmail → Settings → Security → 2-Step Verification → App Passwords → Generate one for "Mail"

---

## 📁 Project Structure

```
cryptovault/
│
├── docker-compose.yml        ← Starts all 3 services together
├── .env                      ← Your secret keys (never commit this!)
│
├── frontend/                 ← React app (what users see)
│   ├── src/
│   │   ├── pages/            ← Each screen of the app
│   │   │   ├── LandingPage.tsx       ← The homepage / marketing page
│   │   │   ├── AuthPage.tsx          ← Login & Sign up
│   │   │   ├── Dashboard.tsx         ← Main portfolio overview
│   │   │   ├── MarketPage.tsx        ← Live crypto prices
│   │   │   ├── AddTransaction.tsx    ← Log a buy/sell
│   │   │   ├── Transactions.tsx      ← Full trade history
│   │   │   ├── AlertsPage.tsx        ← Set price alerts
│   │   │   └── InsightsPage.tsx      ← AI analysis of your portfolio
│   │   ├── components/       ← Reusable UI pieces (Navbar, Cards, etc.)
│   │   ├── context/          ← Global state (auth user info)
│   │   ├── lib/              ← Helpers (API client config)
│   │   └── index.css         ← Global styles & design tokens
│   ├── tailwind.config.js    ← Tailwind theme customisation
│   └── package.json          ← Frontend dependencies
│
└── backend/                  ← FastAPI app (the server)
    ├── app/
    │   ├── main.py           ← Entry point — starts the server
    │   ├── core/             ← Database, auth, config, scheduler
    │   ├── models/           ← Database table definitions
    │   ├── routers/          ← API endpoints (auth, trades, alerts…)
    │   ├── schemas/          ← Data validation (what JSON looks like)
    │   └── services/         ← Business logic & external APIs
    ├── requirements.txt      ← Python dependencies
    └── Dockerfile            ← How to build the backend container
```

---

## 🔌 API Overview

The backend exposes a REST API. You can explore the full interactive docs at **http://localhost:8000/docs** when the server is running.

| Method | Endpoint | What it does |
|---|---|---|
| `POST` | `/auth/register` | Create a new account |
| `POST` | `/auth/login` | Login and get a JWT token |
| `POST` | `/auth/google` | Login with Google |
| `GET` | `/portfolio/` | Get your portfolio summary |
| `GET` | `/transactions/` | List all your trades |
| `POST` | `/transactions/` | Add a new trade |
| `DELETE` | `/transactions/{id}` | Remove a trade |
| `GET` | `/alerts/` | List your price alerts |
| `POST` | `/alerts/` | Create a new price alert |
| `DELETE` | `/alerts/{id}` | Delete an alert |
| `GET` | `/insights/` | Get AI portfolio analysis |
| `WS` | `/ws/market` | WebSocket — live price stream |
| `GET` | `/health` | Check if server is alive |

---

## 🐳 Docker Commands Cheat Sheet

```bash
# Start everything
docker compose up --build

# Start in background (detached mode)
docker compose up -d --build

# Stop everything
docker compose down

# Stop and delete all data (database too!)
docker compose down -v

# View live logs
docker compose logs -f

# View logs for just one service
docker compose logs -f backend
docker compose logs -f frontend
```

---

## 🛠️ Development Tips

**Rebuild only the frontend after UI changes:**
```bash
docker compose up --build frontend
```

**Open an interactive Python shell with the app context:**
```bash
cd backend
source venv/bin/activate
python -c "from app.core.database import engine; print('DB connected')"
```

**Run database migrations (Alembic):**
```bash
cd backend
alembic revision --autogenerate -m "your change description"
alembic upgrade head
```

**Check API health:**
```bash
curl http://localhost:8000/health
# → {"status": "ok", "version": "1.0.0"}
```

---

## 🤝 Contributing

1. Fork the repo
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📝 License

MIT License — use it however you want.

---

<p align="center">Built with ❤️ by Aditya</p>
